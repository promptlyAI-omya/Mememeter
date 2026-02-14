/* ═══════════════════════════════════════════════════════════════
   ReplyMeter Engine — replymeter.js
   "Will Your Crush Reply?" — Standalone probability engine
   ═══════════════════════════════════════════════════════════════ */

const ReplyMeter = (() => {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    let currentStep = 0;
    let answers = { timing: null, msgType: null, seenStatus: null, emoji: null, confidence: 50 };
    let currentResult = null;
    let currentAudioSrc = null;
    let isMuted = false;
    let audioUnlocked = false;

    // Web Audio API
    let audioCtx = null;
    let gainNode = null;
    let gainConnected = false;

    // Audio auto-detect
    const detectedAudio = {};
    let audioReady = false;

    const audioPrefixes = {
        GREEN: 'green',
        DELAY: 'delay',
        OVERTHINK: 'overthink',
        DANGER: 'danger',
        BROTHER: 'brother'
    };

    // DOM cache
    let dom = {};

    /* ── Score Weights ─────────────────────────────────────── */
    const WEIGHTS = {
        timing: 0.25,
        msgType: 0.20,
        seenStatus: 0.30,
        emoji: 0.15,
        confidence: 0.10
    };

    /* Option scores (0-100 scale per option) */
    const SCORES = {
        timing: {
            'lt1hr': 90, '1to6hr': 70, '6to24hr': 45, '1to3d': 20, 'gt3d': 5
        },
        msgType: {
            'double': 25, 'normal': 55, 'meme': 70, 'story': 80, 'voice': 90
        },
        seenStatus: {
            'notseen': 50, 'seennoreply': 10, 'repliedlate': 55, 'repliesfast': 85, 'instant': 95
        },
        emoji: {
            'none': 20, 'laughonly': 40, 'mixed': 60, 'hearts': 85, 'full': 95
        }
    };

    /* ── Ranges ────────────────────────────────────────────── */
    const RANGES = [
        { min: 85, max: 100, key: 'GREEN', title: 'Green Signal Mode', emoji: '💚', glowClass: 'rm-glow-green' },
        { min: 60, max: 84, key: 'DELAY', title: 'Delayed but Possible', emoji: '🕐', glowClass: 'rm-glow-delay' },
        { min: 35, max: 59, key: 'OVERTHINK', title: 'Overthinking Zone', emoji: '🧠', glowClass: 'rm-glow-overthink' },
        { min: 10, max: 34, key: 'DANGER', title: 'Seen Zone Danger', emoji: '⚠️', glowClass: 'rm-glow-danger' },
        { min: 0, max: 9, key: 'BROTHER', title: 'Bhai/Behen Zone Detected', emoji: '🫠', glowClass: 'rm-glow-brother' }
    ];

    /* ── 50 Dialogues (10 per range) ──────────────────────── */
    const DIALOGUES = {
        GREEN: [
            "Typing aa raha hai…\nReply pakka aayega.\nRelax karo, green signal hai.",
            "Crush interested hai.\nReply sirf time ki baat hai.\nSmile karo. 😊",
            "Message padha.\nReply likh raha hai.\nTumhara wait khatam hone waala hai.",
            "Good news:\nCrush tumhe ignore nahi kar raha.\nReply on its way!",
            "Jo log reply nahi karte\nwoh tumhare crush nahi hain.\nYeh wala karega. 💚",
            "Phone utha raha hai.\nTumhara chat khol raha hai.\nTyping… any second now.",
            "Reply chances itne strong hain\nki tumhe stress lene ki zaroorat hi nahi.\nChill karo.",
            "Signal green hai.\nRoute clear hai.\nBas thoda patience rakho.",
            "Crush ka mood dekho:\nOnline hai… Chat open hai…\nReply loading. ✅",
            "Relax.\nYeh wala banda/bandi\nreply karega. Guaranteed vibes."
        ],
        DELAY: [
            "Reply aayega…\nBas thoda late.\nPatience rakh, panic nahi.",
            "Seen toh kar liya hai.\nReply soch raha hai.\nOverthink mat karo.",
            "Crush busy hai.\nIgnore nahi kar raha.\nTime do, reply milega.",
            "Typing aaya…\nPhir gaya.\nPhir aayega. Cycle hai.",
            "Reply ka chance hai.\nBas perfect timing chahiye.\nAbhi mat push karo.",
            "Aaj nahi toh kal.\nKal nahi toh parson.\nBut reply aayega. Probably.",
            "Message delivered hai.\nPadha bhi hoga. Shayad.\nFingers crossed. 🤞",
            "Reply ke signs hain.\nBas crush thoda dramatic hai.\nTheatre khatam hone do.",
            "Notification toh gayi hai.\nAb ball unke court mein hai.\nWait mode: ON.",
            "Late reply bhi reply hai.\nGhanta farak padta hai timing se.\nReply > No reply."
        ],
        OVERTHINK: [
            "Seen hoga…\nReply thoda late aayega.\nOverthinking mat start karo.",
            "50-50 chances hain.\nCoin toss jaisa scene hai.\nBest of luck. 🪙",
            "Crush confused hai.\nReply kare ya na kare.\nTumhari tarah soch raha hai.",
            "Typing aayega…\nPhir disappear hoga.\nEmotional damage incoming.",
            "Reply ka chance hai.\nPar guarantee nahi.\nHope pe duniya chalti hai.",
            "Shayad reply aaye.\nShayad na aaye.\nSchrodinger ka message hai yeh.",
            "Crush ne padha hai.\nPar reply nahi type kiya.\nBrain processing mode mein hai.",
            "Tumne 3 baar check kiya.\nCrush ne 0 baar reply kiya.\nStats clear hain.",
            "Message blue tick hai.\nPar reply grey hai.\nZone mein ho bhai. 🧠",
            "Overthink kar rahe ho.\nJo hona hai woh hoga.\nPhone neeche rakho."
        ],
        DANGER: [
            "Seen.\nBas.\nItna hi milega.",
            "Reply chances kam hain.\nPar zero nahi.\nMiracles happen. Rarely.",
            "Crush ne dekha.\nCrush ne skip kiya.\nClassic move. ⚠️",
            "Notification aayi.\nCrush ne swipe kiya.\nGalat direction mein.",
            "Reply nahi aayega.\nPar tumhara hope abhi bhi alive hai.\nRespect.",
            "Seen zone mein ho.\nYahan se nikalna mushkil hai.\nPar impossible nahi.",
            "Ek aur message bhejoge.\nPhir ek aur seen lagega.\nLoop hai yeh.",
            "Crush online hai.\nSabko reply kar raha hai.\nSirf tumhe chhod ke. 💀",
            "Blue ticks ne bahut kuch keh diya.\nReply ki zaroorat hi nahi rahi.\nF.",
            "Last seen 2 min ago.\nTumhara message 2 din ago.\nMath kar lo khud."
        ],
        BROTHER: [
            "Bhai/Behen zone confirmed.\nReturn ticket nahi hai.\nWelcome home. 🫠",
            "Reply aayega.\n'Haha' ya 'Okay' wala.\nJo real reply nahi hai.",
            "Crush tumhe\napna best friend maanta hai.\nCongratulations. Sort of.",
            "Raksha Bandhan ki tayyari karo.\nSignals clear hain.\nZone pe zone.",
            "Tumhara message padha.\nPhir apne actual crush ko reply kiya.\nOof.",
            "Emoji count: 0\nFlirting signs: 0\nBhai vibes: 100. 📊",
            "Reply milega.\nBut 'bro' ke saath.\nEmotional audit needed.",
            "Crush ne tumhe\ngroup chat mein tag kiya.\nPersonally nahi. Never.",
            "Zone itna deep hai\nki GPS bhi signal kho gaya.\nRIP. 🗺️",
            "Tumhare liye:\n'Tu toh mera bhai/behen hai'\ncard ready hai. Always."
        ]
    };

    /* ── Loading Messages ─────────────────────────────────── */
    const LOADING_MSGS = [
        "Typing status detect ho raha hai…",
        "Last seen analysis chal raha hai…",
        "Emotional risk calculate ho raha hai…",
        "Blue tick pattern scan ho raha hai…",
        "Reply probability generate ho rahi hai…",
        "Crush ka mood analyze ho raha hai…",
        "Chat history ka vibe check ho raha hai…",
        "Overthink level measure ho raha hai…",
        "Final prediction compile ho rahi hai…"
    ];

    /* ── Wizard Steps Config ──────────────────────────────── */
    const STEPS = [
        {
            id: 'timing', label: 'Last Message Kab Bheja?', icon: '⏰',
            options: [
                { value: 'lt1hr', text: '< 1 hour ago' },
                { value: '1to6hr', text: '1–6 hours ago' },
                { value: '6to24hr', text: '6–24 hours ago' },
                { value: '1to3d', text: '1–3 days ago' },
                { value: 'gt3d', text: '3+ days ago' }
            ]
        },
        {
            id: 'msgType', label: 'Kaise Message Bheja?', icon: '💬',
            options: [
                { value: 'double', text: 'Double Text 😬' },
                { value: 'normal', text: 'Normal Chat' },
                { value: 'meme', text: 'Meme / Reel' },
                { value: 'story', text: 'Reply to Story' },
                { value: 'voice', text: 'Voice Note 🎙️' }
            ]
        },
        {
            id: 'seenStatus', label: 'Seen Status Kya Hai?', icon: '👀',
            options: [
                { value: 'notseen', text: 'Not Seen Yet' },
                { value: 'seennoreply', text: 'Seen, No Reply 💀' },
                { value: 'repliedlate', text: 'Replied Late' },
                { value: 'repliesfast', text: 'Replies Fast' },
                { value: 'instant', text: 'Instant Reply ⚡' }
            ]
        },
        {
            id: 'emoji', label: 'Emoji Game Kaisa Hai?', icon: '😊',
            options: [
                { value: 'none', text: 'No Emoji 😐' },
                { value: 'laughonly', text: '😂 Only' },
                { value: 'mixed', text: 'Mixed Emojis' },
                { value: 'hearts', text: '❤️ / 😍 Types' },
                { value: 'full', text: 'Full Expression 🔥' }
            ]
        }
    ];

    /* ══════════════════════════════════════════════════════════
       AUDIO SYSTEM
       ══════════════════════════════════════════════════════════ */

    function ensureGainChain() {
        if (gainConnected || !dom.audio) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(dom.audio);
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 1.15;
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            gainConnected = true;
        } catch (e) {
            console.info('GainNode unavailable — using native volume.');
        }
    }

    async function loadCategoryAudio(category, prefix) {
        const basePath = '../audio/';
        const files = [];
        let index = 1;
        while (index <= 99) {
            const num = String(index).padStart(2, '0');
            const filePath = basePath + prefix + '_' + num + '.mp3';
            try {
                const res = await fetch(filePath, { method: 'HEAD' });
                if (res.ok) { files.push(filePath); index++; }
                else break;
            } catch { break; }
        }
        detectedAudio[category] = files;
    }

    async function initAudio() {
        const tasks = Object.entries(audioPrefixes).map(
            ([cat, prefix]) => loadCategoryAudio(cat, prefix)
        );
        await Promise.all(tasks);
        audioReady = true;
    }

    function pickAudio(rangeKey) {
        const files = detectedAudio[rangeKey];
        if (!files || !files.length) return null;
        return files[Math.floor(Math.random() * files.length)];
    }

    function stopAudio() {
        if (!dom.audio) return;
        dom.audio.pause();
        dom.audio.currentTime = 0;
    }

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

    function playAudio(rangeKey) {
        if (isMuted || !dom.audio) return;
        try {
            ensureGainChain();
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            stopAudio();
            let src = currentAudioSrc || pickAudio(rangeKey);
            if (!src) return;
            currentAudioSrc = src;
            dom.audio.src = src;
            dom.audio.volume = 1.0;
            dom.audio.play().catch(() => {
                console.info('Audio: ' + src + ' — place files in /audio/');
            });
        } catch (e) {
            console.info('Audio playback not available.');
        }
    }

    /* ══════════════════════════════════════════════════════════
       PROBABILITY ENGINE
       ══════════════════════════════════════════════════════════ */

    function calculateProbability() {
        let raw = 0;
        raw += (SCORES.timing[answers.timing] || 50) * WEIGHTS.timing;
        raw += (SCORES.msgType[answers.msgType] || 50) * WEIGHTS.msgType;
        raw += (SCORES.seenStatus[answers.seenStatus] || 50) * WEIGHTS.seenStatus;
        raw += (SCORES.emoji[answers.emoji] || 50) * WEIGHTS.emoji;
        raw += (answers.confidence || 50) * WEIGHTS.confidence;

        // Add ±10 random jitter
        const jitter = (Math.random() * 20) - 10;
        let result = Math.round(raw + jitter);
        return Math.max(1, Math.min(100, result));
    }

    function getRange(percent) {
        for (const r of RANGES) {
            if (percent >= r.min && percent <= r.max) return r;
        }
        return RANGES[RANGES.length - 1];
    }

    function getDialogue(rangeKey) {
        const pool = DIALOGUES[rangeKey];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /* ══════════════════════════════════════════════════════════
       WIZARD UI
       ══════════════════════════════════════════════════════════ */

    function renderWizard() {
        const container = dom.wizardContainer;
        container.innerHTML = '';

        // Steps 0-3: radio options
        STEPS.forEach((step, i) => {
            const card = document.createElement('div');
            card.className = 'rm-step' + (i === 0 ? ' active' : '');
            card.dataset.step = i;
            card.innerHTML = `
                <p class="rm-step-label">${step.icon} ${step.label}</p>
                <div class="rm-radio-grid">
                    ${step.options.map(opt => `
                        <button class="rm-radio-btn" data-field="${step.id}" data-value="${opt.value}">
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>
            `;
            container.appendChild(card);
        });

        // Step 4: confidence slider
        const sliderCard = document.createElement('div');
        sliderCard.className = 'rm-step';
        sliderCard.dataset.step = '4';
        sliderCard.innerHTML = `
            <p class="rm-step-label">🔥 Confidence Level Kitna Hai?</p>
            <div class="rm-slider-wrap">
                <input type="range" id="rm-confidence" class="rm-slider" min="0" max="100" value="50" />
                <div class="rm-slider-value" id="rm-slider-val">50%</div>
            </div>
            <button class="cta-btn rm-check-btn" id="rm-check-btn">
                <span class="cta-text">Check Reply Chance</span>
                <span class="cta-icon">💘</span>
            </button>
        `;
        container.appendChild(sliderCard);

        // Progress bar
        updateProgress();
    }

    function updateProgress() {
        const dots = dom.progressDots;
        if (!dots) return;
        dots.querySelectorAll('.rm-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i <= currentStep);
            dot.classList.toggle('done', i < currentStep);
        });
    }

    function goToStep(step) {
        currentStep = step;
        const cards = dom.wizardContainer.querySelectorAll('.rm-step');
        cards.forEach((c, i) => {
            c.classList.toggle('active', i === step);
        });
        updateProgress();
    }

    /* ══════════════════════════════════════════════════════════
       LOADING & REVEAL
       ══════════════════════════════════════════════════════════ */

    function startLoading() {
        dom.inputSection.classList.add('hidden');
        dom.loadingSection.classList.remove('hidden');

        let msgIndex = 0;
        const msgEl = dom.loadingMsg;
        msgEl.textContent = LOADING_MSGS[0];

        const msgInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % LOADING_MSGS.length;
            msgEl.textContent = LOADING_MSGS[msgIndex];
        }, 800);

        setTimeout(() => {
            clearInterval(msgInterval);
            dom.loadingSection.classList.add('hidden');
            revealResult();
        }, 5000);
    }

    function revealResult() {
        const percent = calculateProbability();
        const range = getRange(percent);
        const dialogue = getDialogue(range.key);

        currentResult = { percent, range, dialogue };
        currentAudioSrc = null; // fresh pick

        // Update card
        dom.resultCard.className = 'rm-result-card ' + range.glowClass;
        dom.resultPercent.textContent = percent + '%';
        dom.resultRangeTitle.textContent = range.emoji + ' ' + range.title;
        dom.resultDialogue.textContent = dialogue;

        dom.resultSection.classList.remove('hidden');
        dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Animate percent counter
        animateCounter(dom.resultPercent, percent);

        // Play audio
        playAudio(range.key);
    }

    function animateCounter(el, target) {
        let current = 0;
        const step = Math.max(1, Math.floor(target / 30));
        const interval = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            el.textContent = current + '%';
        }, 40);
    }

    /* ══════════════════════════════════════════════════════════
       ACTIONS
       ══════════════════════════════════════════════════════════ */

    function shareWhatsApp() {
        if (!currentResult) return;
        const t = `💘 Mera crush reply chance nikla:\n${currentResult.percent}%\n\n${currentResult.range.emoji} ${currentResult.range.title}\n\nTera kitna hai?\nCheck kar: https://bit.ly/mememeter`;
        window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
    }

    function downloadCard() {
        if (!dom.resultCard || typeof html2canvas === 'undefined') return;
        const btn = dom.downloadBtn;
        if (btn) btn.disabled = true;

        html2canvas(dom.resultCard, {
            backgroundColor: '#0a0a16',
            scale: 2,
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'replymeter-result.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).finally(() => {
            if (btn) btn.disabled = false;
        });
    }

    function resetToInput(clearAll) {
        stopAudio();
        currentResult = null;
        currentAudioSrc = null;
        currentStep = 0;

        if (clearAll) {
            answers = { timing: null, msgType: null, seenStatus: null, emoji: null, confidence: 50 };
        }

        dom.resultSection.classList.add('hidden');
        dom.inputSection.classList.remove('hidden');

        // Reset wizard
        renderWizard();
        bindWizardEvents();

        dom.inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ══════════════════════════════════════════════════════════
       EVENT BINDING
       ══════════════════════════════════════════════════════════ */

    function bindWizardEvents() {
        // Radio buttons
        dom.wizardContainer.querySelectorAll('.rm-radio-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const field = btn.dataset.field;
                const value = btn.dataset.value;
                answers[field] = value;

                // Highlight selected
                btn.closest('.rm-radio-grid').querySelectorAll('.rm-radio-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                // Auto-advance after 300ms
                setTimeout(() => {
                    if (currentStep < 4) goToStep(currentStep + 1);
                }, 300);
            });
        });

        // Confidence slider
        const slider = document.getElementById('rm-confidence');
        const sliderVal = document.getElementById('rm-slider-val');
        if (slider) {
            slider.addEventListener('input', () => {
                answers.confidence = parseInt(slider.value);
                if (sliderVal) sliderVal.textContent = slider.value + '%';
            });
        }

        // Check button
        const checkBtn = document.getElementById('rm-check-btn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                // Validate all steps answered
                if (!answers.timing || !answers.msgType || !answers.seenStatus || !answers.emoji) {
                    // Flash the incomplete step
                    const missing = !answers.timing ? 0 : !answers.msgType ? 1 : !answers.seenStatus ? 2 : 3;
                    goToStep(missing);
                    return;
                }
                startLoading();
            });
        }
    }

    /* ══════════════════════════════════════════════════════════
       PUBLIC INIT
       ══════════════════════════════════════════════════════════ */

    function init() {
        // DOM cache
        dom = {
            audio: document.getElementById('rmAudio'),
            inputSection: document.getElementById('rm-input-section'),
            loadingSection: document.getElementById('rm-loading-section'),
            resultSection: document.getElementById('rm-result-section'),
            wizardContainer: document.getElementById('rm-wizard'),
            progressDots: document.getElementById('rm-progress'),
            loadingMsg: document.getElementById('rm-loading-msg'),
            resultCard: document.getElementById('rm-result-card'),
            resultPercent: document.getElementById('rm-percent'),
            resultRangeTitle: document.getElementById('rm-range-title'),
            resultDialogue: document.getElementById('rm-dialogue'),
            soundBtn: document.getElementById('rm-sound-btn'),
            muteBtn: document.getElementById('rm-mute-btn'),
            downloadBtn: document.getElementById('rm-download-btn'),
            shareBtn: document.getElementById('rm-share-btn'),
            friendBtn: document.getElementById('rm-friend-btn'),
            retryBtn: document.getElementById('rm-retry-btn')
        };

        // Init audio
        initAudio();
        document.addEventListener('click', unlockAudio, { once: false });
        document.addEventListener('touchstart', unlockAudio, { once: false });

        // Render wizard
        renderWizard();
        bindWizardEvents();

        // Action buttons
        if (dom.soundBtn) {
            dom.soundBtn.addEventListener('click', () => {
                if (currentResult) playAudio(currentResult.range.key);
            });
        }

        if (dom.muteBtn) {
            dom.muteBtn.addEventListener('click', () => {
                isMuted = !isMuted;
                if (isMuted) stopAudio();
                dom.muteBtn.innerHTML = isMuted ? '🔇 <span>Unmute</span>' : '🔈 <span>Mute</span>';
            });
        }

        if (dom.downloadBtn) {
            dom.downloadBtn.addEventListener('click', () => downloadCard());
        }

        if (dom.shareBtn) {
            dom.shareBtn.addEventListener('click', () => shareWhatsApp());
        }

        if (dom.retryBtn) {
            dom.retryBtn.addEventListener('click', () => resetToInput(true));
        }

        if (dom.friendBtn) {
            dom.friendBtn.addEventListener('click', () => resetToInput(true));
        }
    }

    return { init };
})();
