/* ═══════════════════════════════════════════════════════════════
   MemeMeter.help — Platform Core (core.js)
   Engine registration, weighted random, audio, rendering, export
   ═══════════════════════════════════════════════════════════════ */

const Platform = (() => {
    /* ── Private State ──────────────────────────────────────── */
    const engines = new Map();
    let engine = null;          // active engine config
    let selectedMode = 'Random';
    let currentResult = null;
    let pendingAudioSrc = null;
    let currentAudioSrc = null;
    let isMuted = false;
    let audioUnlocked = false;

    // Web Audio API gain boost (initialized once)
    let audioCtx = null;
    let gainNode = null;
    let gainConnected = false;

    /** Create AudioContext + GainNode once, connect to the audio element */
    function ensureGainChain() {
        if (gainConnected || !dom.audio) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(dom.audio);
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.15; // ~15% safe boost
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            gainConnected = true;
        } catch (e) {
            console.info('GainNode unavailable — using native volume.');
        }
    }

    // DOM cache
    let dom = {};

    /* ── Hash (deterministic seed from name+mode+hour) ────── */
    function hashStr(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h);
    }

    /* ── Weighted Category Selection ────────────────────────── */
    function pickCategory(seed) {
        const cats = engine.categories;
        const total = Object.values(cats).reduce((s, c) => s + c.weight, 0);
        const roll = seed % total;
        let cum = 0;
        for (const [key, cat] of Object.entries(cats)) {
            cum += cat.weight;
            if (roll < cum) return key;
        }
        return Object.keys(cats)[0];
    }

    /* ── Get Result (deterministic per name+mode+hour) ─────── */
    function getResult(name, mode) {
        const hourKey = new Date().getHours().toString();
        const seed = hashStr(name.toLowerCase().trim() + mode + hourKey);
        const category = pickCategory(seed);
        const pool = engine.results.filter(r => r.category === category);
        if (!pool.length) return engine.results[seed % engine.results.length];
        return pool[Math.floor(seed / 100) % pool.length];
    }

    /* ══════════════════════════════════════════════════════════
       AUDIO SYSTEM — Auto-detection, modular, future-proof
       ══════════════════════════════════════════════════════════ */

    const detectedAudio = {};  // { ALPHA: ['../audio/alpha_01.mp3', ...], ... }
    let audioReady = false;

    /** Probe files for one category: prefix_01.mp3, prefix_02.mp3, … */
    async function loadCategoryAudio(category, prefix) {
        const basePath = engine.audioBasePath || '';
        const files = [];
        let index = 1;

        while (index <= 99) { // safety cap
            const num = String(index).padStart(2, '0');
            const filePath = basePath + prefix + '_' + num + '.mp3';
            try {
                const res = await fetch(filePath, { method: 'HEAD' });
                if (res.ok) {
                    files.push(filePath);
                    index++;
                } else {
                    break;
                }
            } catch {
                break;
            }
        }

        detectedAudio[category] = files;
    }

    /** Detect all audio files for every category prefix */
    async function initAudio() {
        const prefixes = engine.audioPrefixes;
        if (!prefixes) { audioReady = true; return; }

        const tasks = Object.entries(prefixes).map(
            ([cat, prefix]) => loadCategoryAudio(cat, prefix)
        );
        await Promise.all(tasks);
        audioReady = true;
    }

    /** Pick a random detected file for a category (returns full path or null) */
    function pickAudio(category) {
        const files = detectedAudio[category];
        if (!files || !files.length) return null;
        return files[Math.floor(Math.random() * files.length)];
    }

    /** Stop current audio immediately */
    function stopCurrentAudio() {
        if (!dom.audio) return;
        dom.audio.pause();
        dom.audio.currentTime = 0;
    }

    /* ── Audio Unlock (first interaction) ──────────────────── */
    function unlockAudio() {
        if (audioUnlocked || !dom.audio) return;
        dom.audio.muted = true;
        dom.audio.play().then(() => {
            dom.audio.pause();
            dom.audio.muted = false;
            dom.audio.currentTime = 0;
            audioUnlocked = true;
        }).catch(() => { });
    }

    /** Play audio for a category (new random, or pending/replay) */
    function playSelectedAudio(category) {
        if (isMuted || !dom.audio) return;
        try {
            ensureGainChain();
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            stopCurrentAudio();

            let src;
            if (pendingAudioSrc) {
                src = pendingAudioSrc;
                pendingAudioSrc = null;
            } else if (currentAudioSrc) {
                src = currentAudioSrc; // replay same audio
            } else {
                src = pickAudio(category);
            }
            if (!src) return;

            currentAudioSrc = src;
            dom.audio.src = src;
            dom.audio.volume = 1.0;
            dom.audio.play().catch(() => {
                console.info('Audio: ' + src + ' — place your .mp3 files in /audio/');
            });
        } catch (e) {
            console.info('Audio playback not available.');
        }
    }

    /* ── Loading Messages Rotation ─────────────────────────── */
    function startLoading(name) {
        dom.checkBtn.disabled = true;
        dom.inputSection.classList.add('hidden');
        dom.resultSection.classList.add('hidden');
        dom.loadingSection.classList.remove('hidden');
        dom.loadingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const msgs = engine.loadingMessages || ['Analyzing...'];
        let i = 0;
        dom.loadingMsg.textContent = msgs[0];
        const interval = setInterval(() => {
            i = (i + 1) % msgs.length;
            dom.loadingMsg.textContent = msgs[i];
        }, 1000);

        setTimeout(() => {
            clearInterval(interval);
            revealResult(name);
        }, 5000);
    }

    /* ── Result Reveal ─────────────────────────────────────── */
    function revealResult(name) {
        currentResult = getResult(name, selectedMode);

        dom.resultEmoji.textContent = currentResult.emoji;
        dom.resultTitle.textContent = currentResult.title;
        dom.resultName.textContent = name;
        dom.resultText.textContent = currentResult.text;
        dom.resultBadge.textContent = engine.categories[currentResult.category]?.label || currentResult.category;
        dom.memeCard.setAttribute('data-category', currentResult.category);

        dom.loadingSection.classList.add('hidden');
        dom.resultSection.classList.remove('hidden');
        dom.checkBtn.disabled = false;

        dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        playSelectedAudio(currentResult.category);
    }

    /* ── Download Aura Card ────────────────────────────────── */
    async function downloadCard(username) {
        if (!dom.memeCard || typeof html2canvas === 'undefined') {
            alert('Download feature loading... try again.');
            return;
        }
        const btn = dom.downloadBtn;
        try {
            btn.disabled = true;
            btn.querySelector('span').textContent = 'Wait...';
            const canvas = await html2canvas(dom.memeCard, {
                backgroundColor: '#0a0a16',
                scale: 2, useCORS: true, logging: false,
                width: dom.memeCard.offsetWidth,
                height: dom.memeCard.offsetWidth
            });
            const a = document.createElement('a');
            a.download = 'mememeter-' + (username || 'result').toLowerCase().replace(/\s+/g, '-') + '.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        } catch (e) {
            console.error('Download failed:', e);
            alert('Could not generate image.');
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Download';
        }
    }

    /* ── WhatsApp Share ────────────────────────────────────── */
    function shareWhatsApp() {
        if (!currentResult) return;
        const t = `😂 Bhai mera MemeMeter result dekh:\n\n${currentResult.emoji} ${currentResult.title}\n"${currentResult.text}"\n\nTera kya niklega?\nCheck kar: https://bit.ly/mememeter`;
        window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
    }

    /* ── Reset to Input ────────────────────────────────────── */
    function resetToInput(clearName) {
        stopCurrentAudio();
        currentResult = null;
        currentAudioSrc = null;
        pendingAudioSrc = null;
        dom.resultSection.classList.add('hidden');
        dom.inputSection.classList.remove('hidden');
        if (clearName) dom.username.value = '';
        dom.username.focus();
        dom.inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ══════════════════════════════════════════════════════════
       PUBLIC API
       ══════════════════════════════════════════════════════════ */
    return {
        /** Register an engine (call from engine-specific JS) */
        registerEngine(config) {
            engines.set(config.slug, config);
        },

        /** Initialize platform for a specific engine (call on DOMContentLoaded) */
        init(engineSlug) {
            engine = engines.get(engineSlug);
            if (!engine) { console.error('Engine "' + engineSlug + '" not registered.'); return; }

            // Cache DOM
            dom = {
                audio: document.getElementById('engineAudio'),
                inputSection: document.getElementById('input-section'),
                loadingSection: document.getElementById('loading-section'),
                resultSection: document.getElementById('result-section'),
                username: document.getElementById('username'),
                checkBtn: document.getElementById('check-btn'),
                retryBtn: document.getElementById('retry-btn'),
                friendBtn: document.getElementById('friend-btn'),
                downloadBtn: document.getElementById('download-btn'),
                shareBtn: document.getElementById('share-btn'),
                soundBtn: document.getElementById('sound-btn'),
                muteBtn: document.getElementById('mute-btn'),
                loadingMsg: document.getElementById('loading-msg'),
                modeGrid: document.getElementById('mode-grid'),
                resultEmoji: document.getElementById('result-emoji'),
                resultTitle: document.getElementById('result-title'),
                resultName: document.getElementById('result-name'),
                resultText: document.getElementById('result-text'),
                resultBadge: document.getElementById('result-badge'),
                memeCard: document.getElementById('meme-card'),
            };

            // Auto-detect audio files + global unlock
            initAudio();
            document.addEventListener('click', unlockAudio, { once: false });
            document.addEventListener('touchstart', unlockAudio, { once: false });

            // Mode selection
            dom.modeGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('.mode-btn');
                if (!btn) return;
                dom.modeGrid.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedMode = btn.dataset.mode;
            });

            // Check button — unlock audio in gesture chain + start flow
            dom.checkBtn.addEventListener('click', () => {
                const name = dom.username.value.trim();
                if (!name) {
                    dom.username.focus();
                    dom.username.style.borderColor = '#ef4444';
                    dom.username.style.boxShadow = '0 0 12px rgba(239,68,68,.35)';
                    setTimeout(() => { dom.username.style.borderColor = ''; dom.username.style.boxShadow = ''; }, 1500);
                    return;
                }

                // Pre-select audio & unlock in user gesture chain
                const preResult = getResult(name, selectedMode);
                const src = pickAudio(preResult.category);
                if (src && dom.audio) {
                    pendingAudioSrc = src;
                    dom.audio.src = src;
                    dom.audio.volume = 0.01;
                    dom.audio.play().then(() => {
                        dom.audio.pause();
                        dom.audio.currentTime = 0;
                        dom.audio.volume = 1.0;
                        audioUnlocked = true;
                    }).catch(() => { dom.audio.volume = 1.0; });
                }

                startLoading(name);
            });

            // Enter key
            dom.username.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') dom.checkBtn.click();
            });

            // Replay
            dom.soundBtn.addEventListener('click', () => {
                if (currentResult) playSelectedAudio(currentResult.category);
            });

            // Mute
            dom.muteBtn.addEventListener('click', () => {
                isMuted = !isMuted;
                dom.muteBtn.innerHTML = '';
                dom.muteBtn.appendChild(document.createTextNode(isMuted ? '🔇 ' : '🔈 '));
                const sp = document.createElement('span');
                sp.textContent = isMuted ? 'Unmute' : 'Mute';
                dom.muteBtn.appendChild(sp);
                if (dom.audio) dom.audio.muted = isMuted;
            });

            // Download
            dom.downloadBtn.addEventListener('click', () => {
                downloadCard(dom.username.value.trim());
            });

            // Share
            dom.shareBtn.addEventListener('click', shareWhatsApp);

            // Try Again
            dom.retryBtn.addEventListener('click', () => resetToInput(true));

            // Check Friend
            if (dom.friendBtn) {
                dom.friendBtn.addEventListener('click', () => resetToInput(true));
            }
        }
    };
})();
