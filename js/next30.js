/* ═══════════════════════════════════════════════════════════════
   Next30 Engine — next30.js
   "What's Shifting?" — Cinematic emotional shift predictor
   ═══════════════════════════════════════════════════════════════ */

const Next30 = (() => {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    let currentStep = 0;
    let answers = { mask: null, concern: null, behaviour: null, energy: null };
    let currentResult = null;
    let dom = {};

    /* ── Score Weights per Answer ──────────────────────────── */
    const SCORE_MAP = {
        mask: {
            'strong_confused': { tension: 2, action: 0, stability: 1, externalShift: 0 },
            'calm_tired': { tension: 1, action: 0, stability: 2, externalShift: 0 },
            'planning_secretly': { tension: 0, action: 2, stability: 0, externalShift: 1 },
            'overthinking': { tension: 2, action: 0, stability: 0, externalShift: 1 },
            'acting_normal': { tension: 1, action: 0, stability: 1, externalShift: 1 }
        },
        concern: {
            'money': { tension: 1, action: 0, stability: 0, externalShift: 2 },
            'relationship': { tension: 1, action: 0, stability: -1, externalShift: 1 },
            'career': { tension: 0, action: 1, stability: 0, externalShift: 2 },
            'social_image': { tension: 1, action: 0, stability: 1, externalShift: 1 },
            'self_worth': { tension: 2, action: 0, stability: -1, externalShift: 0 }
        },
        behaviour: {
            'avoiding': { tension: 0, action: -1, stability: 2, externalShift: 0 },
            'waiting_sign': { tension: 1, action: 0, stability: 1, externalShift: 1 },
            'silent_action': { tension: 0, action: 2, stability: 0, externalShift: 1 },
            'distracting': { tension: 1, action: -1, stability: 1, externalShift: 0 },
            'pretending': { tension: 1, action: 0, stability: 2, externalShift: 0 }
        },
        energy: {
            'sleeping_late': { tension: 1, action: 0, stability: -1, externalShift: 0 },
            'random_routine': { tension: 0, action: 1, stability: -1, externalShift: 1 },
            'more_silent': { tension: 1, action: 1, stability: 0, externalShift: 0 },
            'observing': { tension: 1, action: 1, stability: 0, externalShift: 0 }
        }
    };

    /* ── Modes ─────────────────────────────────────────────── */
    const MODES = [
        { key: 'EMOTIONAL', title: 'Emotional Shift Mode', icon: '🌊', glowClass: 'n30-glow-emotional' },
        { key: 'EXTERNAL', title: 'External Opportunity Mode', icon: '✦', glowClass: 'n30-glow-external' },
        { key: 'GROWTH', title: 'Silent Growth Mode', icon: '🌱', glowClass: 'n30-glow-growth' },
        { key: 'RELATIONSHIP', title: 'Relationship Realignment Mode', icon: '🔗', glowClass: 'n30-glow-relationship' },
        { key: 'RESET', title: 'Internal Reset Mode', icon: '◯', glowClass: 'n30-glow-reset' }
    ];

    /* ── 50 Dialogue Sets (10 per mode) ───────────────────── */
    const DIALOGUES = {
        EMOTIONAL: [
            {
                shift: "Something inside you has already let go — you just haven't admitted it yet.",
                signal: "Watch for a conversation that feels heavier than it should. That's where the shift lives.",
                truth: "You've been carrying something that stopped belonging to you a while ago.",
                guidance: "Let the weight drop. What remains is yours."
            },
            {
                shift: "A feeling you buried is resurfacing — not to hurt you, but to finally leave.",
                signal: "Someone from your past will cross your mind more than usual. Don't chase the thought.",
                truth: "You're not confused. You're just afraid of the clarity.",
                guidance: "Sit with it. Clarity doesn't need your permission to arrive."
            },
            {
                shift: "The version of you from two months ago wouldn't recognize who you're becoming.",
                signal: "Pay attention to what stops making you react. That's the shift.",
                truth: "You've already outgrown something — you're just waiting for the world to catch up.",
                guidance: "Stop explaining yourself to people who knew the old version. Move."
            },
            {
                shift: "Your emotional center is quietly relocating. Old triggers won't land the same way.",
                signal: "A space that once felt safe will start feeling small. That's growth pushing you out.",
                truth: "You've been performing stability — but inside, something has already moved.",
                guidance: "Trust the discomfort. It's steering, not breaking."
            },
            {
                shift: "There's a sadness that isn't about loss — it's about the version of you that's leaving.",
                signal: "An unexpected silence from someone will say more than words ever did.",
                truth: "You've known this was coming. You were just waiting to feel ready.",
                guidance: "You won't feel ready. Move anyway."
            },
            {
                shift: "Your emotional bandwidth is narrowing — not because you're weaker, but more selective.",
                signal: "Notice who drains you now versus three months ago. The list has changed.",
                truth: "You're not becoming cold. You're just done performing warmth for people who don't deserve it.",
                guidance: "Protect your energy. Silence is a complete sentence."
            },
            {
                shift: "A quiet grief is settling — not from something lost, but something that was never real.",
                signal: "A memory you idealized will replay differently. Let the new version in.",
                truth: "You held on because letting go felt like failure. It wasn't.",
                guidance: "Grieve cleanly. Then close that chapter."
            },
            {
                shift: "Your emotional compass is recalibrating. What once felt essential now feels optional.",
                signal: "An old message or photo will hit different. That's the distance you've earned.",
                truth: "The ache you carry isn't weakness — it's your depth catching up with your decisions.",
                guidance: "Let the recalibration finish. Don't force stability on chaos."
            },
            {
                shift: "Something tender is opening up — and you're terrified of how soft you could become.",
                signal: "Someone will show you unexpected kindness. Don't deflect it.",
                truth: "You've been so strong for so long that vulnerability feels like a foreign language.",
                guidance: "Strength got you here. Softness gets you through."
            },
            {
                shift: "The emotional walls you built were necessary. But some of them are now blocking light.",
                signal: "A sincere question from someone will catch you off guard. Answer honestly.",
                truth: "You're not protecting yourself anymore — you're hiding.",
                guidance: "Lower one wall. Just one. See what enters."
            }
        ],
        EXTERNAL: [
            {
                shift: "An external door is about to open — but not the one you've been staring at.",
                signal: "A casual interaction will carry more weight than expected. Pay attention.",
                truth: "What you've been forcing hasn't worked because it wasn't yours to begin with.",
                guidance: "Stop pushing the closed door. Turn around."
            },
            {
                shift: "Something in your environment is about to rearrange — finances, geography, or access.",
                signal: "A message or offer you almost ignore will turn out to be significant.",
                truth: "You've been undervaluing what the universe is trying to hand you.",
                guidance: "Say yes to the thing that doesn't look perfect yet."
            },
            {
                shift: "The next opportunity won't look like the last one. That's why you'll almost miss it.",
                signal: "Watch for a change in someone else's situation that indirectly creates space for you.",
                truth: "You're closer than you think — you've just been measuring with the wrong ruler.",
                guidance: "Update your expectations. The opportunity has a new shape."
            },
            {
                shift: "What's approaching isn't luck — it's the delayed result of moves you made months ago.",
                signal: "A financial or professional pattern will shift unexpectedly. Stay alert, not anxious.",
                truth: "You planted seeds and forgot about them. Some are sprouting now.",
                guidance: "Don't question the timing. Just be present to receive."
            },
            {
                shift: "An external structure you relied on is weakening — but something better is scaffolding beneath.",
                signal: "An ending in your professional or social orbit will create an opening specifically for you.",
                truth: "Security was never in the structure. It was always in your ability to adapt.",
                guidance: "Let the old structure crack. You've already outgrown it."
            },
            {
                shift: "People around you are about to make decisions that inadvertently create your next chapter.",
                signal: "A friend or colleague will share something that silently redirects your thinking.",
                truth: "You've been waiting for your own plan to work. Someone else's move unlocks yours.",
                guidance: "Watch the ripple. Position yourself near the wave, not against it."
            },
            {
                shift: "A resource you counted out is circling back — different timing, different form.",
                signal: "Check something you dismissed weeks ago. The context has changed.",
                truth: "You said no too early. Or the offer wasn't ripe yet. Either way — it's back.",
                guidance: "Revisit with fresh eyes. What was wrong then may be right now."
            },
            {
                shift: "Your external world is rearranging to match the internal decision you already made.",
                signal: "A coincidence will feel too specific to be random. It isn't.",
                truth: "You decided already — the world is just catching up to your certainty.",
                guidance: "Stop second-guessing. Your instinct already cast the vote."
            },
            {
                shift: "Something you gave up on is quietly re-entering the frame — but only if you're paying attention.",
                signal: "A name, place, or topic will reappear from an unlikely source. That's your cue.",
                truth: "You moved on, but the thing didn't. It was waiting for you to be ready.",
                guidance: "Approach it without the old expectations. You've changed — let the situation be new too."
            },
            {
                shift: "The external shift isn't dramatic — it's a quiet repositioning that changes everything downstream.",
                signal: "A small logistical change will create a domino effect. Don't underestimate it.",
                truth: "You've been looking for the big break. But the shift is small and precise.",
                guidance: "Appreciate the subtlety. Precision beats spectacle."
            }
        ],
        GROWTH: [
            {
                shift: "You're growing in a way that no one can see — and that's exactly why it's real.",
                signal: "Notice what no longer excites you. That's not apathy — it's graduation.",
                truth: "You're not stuck. You're composting. Everything valuable is happening underground.",
                guidance: "Don't demand visible results. The roots are doing the work."
            },
            {
                shift: "The silence you're sitting in isn't emptiness — it's preparation disguised as stillness.",
                signal: "A skill or habit you recently started will become more relevant than you expected.",
                truth: "You've been building something no one sees yet. Not even you, fully.",
                guidance: "Keep going. The output will surprise you — and others."
            },
            {
                shift: "Your taste level is rising faster than your circumstances. The gap is uncomfortable but necessary.",
                signal: "Something you once tolerated will suddenly feel intolerable. That's elevation.",
                truth: "You're not becoming picky. You're becoming precise.",
                guidance: "Don't apologize for higher standards. They're the price of growth."
            },
            {
                shift: "What feels like isolation is actually incubation. Something in you is forming.",
                signal: "You'll find focus in unexpected pockets of solitude. Don't fill them with noise.",
                truth: "The world didn't push you away. You withdrew to rebuild.",
                guidance: "Honor the isolation. It's the studio, not the exile."
            },
            {
                shift: "Your mind is reorganizing priorities — quietly moving things to the back and front of the shelf.",
                signal: "A commitment that felt important will suddenly feel negotiable.",
                truth: "You're not losing interest. You're gaining clarity about what actually matters.",
                guidance: "Trim without guilt. Clarity is ruthless."
            },
            {
                shift: "You're outgrowing a version of yourself that served you well — and that makes it harder to let go.",
                signal: "Old jokes, habits, or patterns will feel slightly off. That's the new you rejecting the old code.",
                truth: "Gratitude and growth can coexist. You can thank the old version and still leave.",
                guidance: "Let the old identity rest. It did its job."
            },
            {
                shift: "Every uncomfortable thought you've been sitting with is reshaping your next decision.",
                signal: "A quiet conviction will solidify — something that once felt unsure will click into place.",
                truth: "You've been in the fog because you're between two altitudes. The air is thinner here.",
                guidance: "Keep climbing. The view clears with elevation."
            },
            {
                shift: "The books, the walks, the silence — they're not distractions. They're curriculum.",
                signal: "An idea you've been curious about will connect to something concrete. Follow it.",
                truth: "You're self-educating for a version of your life that doesn't exist yet — and that takes courage.",
                guidance: "Trust the curiosity. It knows where you're headed."
            },
            {
                shift: "Your patience is being tested — but the test itself is the growth.",
                signal: "A delayed result will arrive, but only after you've stopped checking for it.",
                truth: "You've been equating progress with speed. But depth moves slowly.",
                guidance: "Redefine progress. Stillness that builds is faster than motion that circles."
            },
            {
                shift: "Something you practiced privately is about to become publicly visible.",
                signal: "Someone will notice a change in your demeanor before you do. Take the compliment.",
                truth: "You didn't waste a single quiet day. Every one of them counted.",
                guidance: "Step forward. The preparation phase is ending."
            }
        ],
        RELATIONSHIP: [
            {
                shift: "A relationship in your life is being quietly recalibrated — not ending, but changing shape.",
                signal: "The energy between you and someone close will shift. It might feel like distance, but it's recalibration.",
                truth: "You've been holding a dynamic together that only works when you carry the weight.",
                guidance: "Set it down. See who adjusts and who walks away."
            },
            {
                shift: "Someone you care about is going through something that will change how they relate to you.",
                signal: "A conversation you've been avoiding will become unavoidable. Let it happen gently.",
                truth: "It's not about right or wrong. It's about whether you're growing in the same direction.",
                guidance: "Speak without defending. Listen without preparing a response."
            },
            {
                shift: "A connection that once felt permanent is revealing itself to be conditional. And that clarity is a gift.",
                signal: "Notice who reaches out — and who only responds when reached. That data matters now.",
                truth: "You're not losing people. You're just seeing them with better lighting.",
                guidance: "Better lighting hurts. But building in the dark hurts more."
            },
            {
                shift: "Your boundary is upgrading — and some people won't survive the new version of your respect.",
                signal: "Someone will test your patience in a familiar way. Your response will be different this time.",
                truth: "You've been tolerating a dynamic because leaving felt selfish. It isn't.",
                guidance: "Choosing yourself in a relationship isn't betrayal — it's integrity."
            },
            {
                shift: "An unexpected warmth will arrive from someone you underestimated.",
                signal: "A person on the periphery will step forward with unexpected support.",
                truth: "You've been looking for loyalty in loud places. Sometimes it's quiet.",
                guidance: "Let new alliances form. Loyalty doesn't always come from history."
            },
            {
                shift: "A conversation left unfinished is creating more tension than you realize.",
                signal: "You'll replay a specific interaction in your head. That's the thread to pull.",
                truth: "Avoidance has its own cost. And you've been paying interest on it for weeks.",
                guidance: "One honest conversation can replace months of overthinking."
            },
            {
                shift: "Someone is watching your growth and it's making them uncomfortable — not because you're wrong, but because you're proof that change is possible.",
                signal: "A subtle change in someone's tone or frequency of contact will reveal their discomfort.",
                truth: "Your evolution triggers other people's stagnation. That's not your problem to solve.",
                guidance: "Grow anyway. The right people will celebrate, not compete."
            },
            {
                shift: "The relationship you're most uncertain about is the one teaching you the most right now.",
                signal: "A pattern will repeat — and this time you'll recognize it before reacting.",
                truth: "You keep learning the same lesson because you keep accepting the same treatment.",
                guidance: "Break the pattern. Even if it means sitting alone for a while."
            },
            {
                shift: "A bond is deepening quietly — not through grand gestures, but through consistent presence.",
                signal: "Someone will say something small that rewires your feeling about them. Pay attention to understatement.",
                truth: "You've been measuring love by intensity. But the deepest bonds are measured by steadiness.",
                guidance: "Water what's growing. Don't chase what's wilting."
            },
            {
                shift: "You're about to discover who's actually in your corner — and the answer might surprise you.",
                signal: "A moment of vulnerability will reveal someone's true investment in your life.",
                truth: "You assumed you knew your circle. You knew their surface.",
                guidance: "Let people reveal themselves. Then decide."
            }
        ],
        RESET: [
            {
                shift: "Your system is running a hard reset — and everything that isn't core is being cleared out.",
                signal: "You'll feel an unusual desire to simplify — possessions, plans, even people. That's the reset.",
                truth: "You didn't break. You overloaded. There's a difference.",
                guidance: "Strip back to essentials. Complexity isn't serving you right now."
            },
            {
                shift: "The fatigue isn't physical — it's the weight of maintaining versions of yourself that don't fit anymore.",
                signal: "A routine you've kept for months will suddenly feel exhausting. It has run its course.",
                truth: "You're tired because you've been running someone else's program.",
                guidance: "Delete the routine. Start one that belongs to who you are now."
            },
            {
                shift: "You're entering a clearing phase. Not dramatic — just methodical. Like defrosting in silence.",
                signal: "You'll delete something, unfollow someone, or clean a space — and it'll feel disproportionately freeing.",
                truth: "The clutter was emotional, not physical. Clearing the surface clears the mind.",
                guidance: "One drawer. One conversation. One account. Start there."
            },
            {
                shift: "Your inner compass is returning to factory settings. Nothing is broken — it's recalibrating.",
                signal: "You'll wake up one morning with unusual stillness. That's the reset completing.",
                truth: "You went through so much adaptation that you forgot what your baseline feels like.",
                guidance: "Return to center. Not who you became — who you were before you started performing."
            },
            {
                shift: "You've been running on borrowed motivation. The reset is your own engine turning back on.",
                signal: "Something you used to love but abandoned will pull you back. Don't resist the tug.",
                truth: "You didn't lose passion. You just got too busy surviving to feel it.",
                guidance: "Reconnect with what lit you up before the world told you to be practical."
            },
            {
                shift: "The numbness you feel isn't apathy. It's your nervous system creating space for something real.",
                signal: "An emotion you suppressed will surface at an unexpected time. Let it pass through.",
                truth: "You've been so focused on output that you forgot to process input.",
                guidance: "Feel first. Function later. They work in that order."
            },
            {
                shift: "Your identity is shedding a layer — and the rawness underneath is exactly what's needed.",
                signal: "You'll feel exposed without reason. That's the old armor dissolving.",
                truth: "You built a version of yourself to survive. That version's contract has expired.",
                guidance: "Be raw for a while. The new skin forms faster in open air."
            },
            {
                shift: "Everything that's been on pause is about to restart — but only after you give yourself permission to stop.",
                signal: "A full day of doing nothing will unlock something a month of effort couldn't.",
                truth: "The machine doesn't run better when you push harder. It runs better after maintenance.",
                guidance: "Rest isn't retreat. It's reloading."
            },
            {
                shift: "A belief system you built your decisions around is quietly dissolving. And that's the healthiest thing that's happened to you in months.",
                signal: "Something you were certain about will start feeling negotiable. That's wisdom entering.",
                truth: "Certainty was comfortable. But it was also a cage.",
                guidance: "Let the belief update. Rigid minds break. Flexible ones bend and bounce."
            },
            {
                shift: "The reset isn't about what's next — it's about who you are when nothing external is validating you.",
                signal: "A period of low engagement or silence from others will feel strangely productive.",
                truth: "You've been measuring your worth by how needed you are. That metric is broken.",
                guidance: "Exist without performing. That's the reset."
            }
        ]
    };

    /* ── Loading Messages ─────────────────────────────────── */
    const LOADING_MSGS = [
        "Emotional timeline aligning…",
        "Behaviour pattern syncing…",
        "Hidden shift detected…",
        "External energy recalibrating…",
        "Deep pattern scan in progress…",
        "Mapping internal variables…",
        "Assembling your next chapter…",
        "Final alignment processing…"
    ];

    /* ── Wizard Steps Config ──────────────────────────────── */
    const STEPS = [
        {
            id: 'mask', label: 'Your Emotional Mask',
            options: [
                { value: 'strong_confused', text: 'Strong outside, confused inside' },
                { value: 'calm_tired', text: 'Calm but tired' },
                { value: 'planning_secretly', text: 'Planning something secretly' },
                { value: 'overthinking', text: 'Overthinking quietly' },
                { value: 'acting_normal', text: 'Acting normal but not okay' }
            ]
        },
        {
            id: 'concern', label: 'Your Hidden Concern',
            options: [
                { value: 'money', text: 'Money pressure' },
                { value: 'relationship', text: 'Relationship shift' },
                { value: 'career', text: 'Career uncertainty' },
                { value: 'social_image', text: 'Social image' },
                { value: 'self_worth', text: 'Self-worth' }
            ]
        },
        {
            id: 'behaviour', label: 'Your Behaviour Pattern',
            options: [
                { value: 'avoiding', text: 'Avoiding confrontation' },
                { value: 'waiting_sign', text: 'Waiting for a sign' },
                { value: 'silent_action', text: 'Taking silent action' },
                { value: 'distracting', text: 'Distracting myself' },
                { value: 'pretending', text: 'Pretending everything is fine' }
            ]
        },
        {
            id: 'energy', label: 'Your Energy Pattern',
            options: [
                { value: 'sleeping_late', text: 'Sleeping late' },
                { value: 'random_routine', text: 'Random routine' },
                { value: 'more_silent', text: 'More silent than usual' },
                { value: 'observing', text: 'Observing more, talking less' }
            ]
        }
    ];

    /* ══════════════════════════════════════════════════════════
       SCORING ENGINE
       ══════════════════════════════════════════════════════════ */

    function calculateScores() {
        const scores = { tension: 0, action: 0, stability: 0, externalShift: 0 };

        for (const [stepId, answer] of Object.entries(answers)) {
            if (!answer || !SCORE_MAP[stepId] || !SCORE_MAP[stepId][answer]) continue;
            const s = SCORE_MAP[stepId][answer];
            scores.tension += s.tension;
            scores.action += s.action;
            scores.stability += s.stability;
            scores.externalShift += s.externalShift;
        }

        return scores;
    }

    function determineMode(scores) {
        // Add slight random jitter (±1) to prevent pure determinism
        const jitter = () => (Math.random() * 2) - 1;

        const candidates = [
            { mode: MODES[0], score: scores.tension + jitter() },                                  // Emotional Shift
            { mode: MODES[1], score: scores.externalShift + jitter() },                             // External Opportunity
            { mode: MODES[2], score: scores.action + jitter() },                                    // Silent Growth
            { mode: MODES[3], score: (scores.tension * 0.6 + (-scores.stability) * 0.4) + jitter() },// Relationship Realignment
            { mode: MODES[4], score: (scores.stability * 0.7 + (-scores.action) * 0.3) + jitter() } // Internal Reset
        ];

        candidates.sort((a, b) => b.score - a.score);
        return candidates[0].mode;
    }

    function getDialogue(modeKey) {
        const pool = DIALOGUES[modeKey];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /* ══════════════════════════════════════════════════════════
       WIZARD UI
       ══════════════════════════════════════════════════════════ */

    function renderWizard() {
        const container = dom.wizardContainer;
        container.innerHTML = '';

        STEPS.forEach((step, i) => {
            const card = document.createElement('div');
            card.className = 'n30-step' + (i === 0 ? ' active' : '');
            card.dataset.step = i;
            card.innerHTML = `
                <p class="n30-step-label">${step.label}</p>
                <div class="n30-option-grid">
                    ${step.options.map(opt => `
                        <button class="n30-option-btn" data-field="${step.id}" data-value="${opt.value}">
                            ${opt.text}
                        </button>
                    `).join('')}
                </div>
            `;
            container.appendChild(card);

            // If last step, add reveal button
            if (i === STEPS.length - 1) {
                const btnWrap = document.createElement('div');
                btnWrap.className = 'n30-step';
                btnWrap.dataset.step = STEPS.length;
                btnWrap.innerHTML = `
                    <p class="n30-step-label">Ready to see what's shifting?</p>
                    <button class="cta-btn n30-reveal-btn" id="n30-reveal-btn">
                        <span class="cta-text">Reveal My Next30</span>
                        <span class="cta-icon">🔮</span>
                    </button>
                `;
                container.appendChild(btnWrap);
            }
        });

        updateProgress();
    }

    function updateProgress() {
        const dots = dom.progressDots;
        if (!dots) return;
        dots.querySelectorAll('.n30-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i <= currentStep);
            dot.classList.toggle('done', i < currentStep);
        });
    }

    function goToStep(step) {
        currentStep = step;
        const cards = dom.wizardContainer.querySelectorAll('.n30-step');
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
        dom.overlay.classList.add('n30-darken');

        let msgIndex = 0;
        const msgEl = dom.loadingMsg;
        msgEl.textContent = LOADING_MSGS[0];

        const msgInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % LOADING_MSGS.length;
            msgEl.style.opacity = '0';
            setTimeout(() => {
                msgEl.textContent = LOADING_MSGS[msgIndex];
                msgEl.style.opacity = '1';
            }, 250);
        }, 1000);

        setTimeout(() => {
            clearInterval(msgInterval);
            dom.loadingSection.classList.add('hidden');
            dom.overlay.classList.remove('n30-darken');
            renderResult();
        }, 5000);
    }

    function renderResult() {
        const scores = calculateScores();
        const mode = determineMode(scores);
        const dialogue = getDialogue(mode.key);

        currentResult = { mode, dialogue };

        // Card glow
        dom.resultCard.className = 'n30-result-card ' + mode.glowClass;

        // Mode header
        dom.modeIcon.textContent = mode.icon;
        dom.modeTitle.textContent = mode.title;

        // 4 blocks
        dom.blockShift.textContent = dialogue.shift;
        dom.blockSignal.textContent = dialogue.signal;
        dom.blockTruth.textContent = dialogue.truth;
        dom.blockGuidance.textContent = dialogue.guidance;

        // Closing line
        dom.closingLine.textContent = 'You felt this before reading… didn\'t you?';

        // Summary for export card
        dom.exportTitle.textContent = mode.title;
        dom.exportSummary.textContent = dialogue.shift;

        dom.resultSection.classList.remove('hidden');
        dom.resultSection.style.opacity = '0';
        requestAnimationFrame(() => {
            dom.resultSection.style.transition = 'opacity 0.8s ease';
            dom.resultSection.style.opacity = '1';
        });
        dom.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ══════════════════════════════════════════════════════════
       ACTIONS
       ══════════════════════════════════════════════════════════ */

    function shareWhatsApp() {
        if (!currentResult) return;
        const t = `🔮 Mera Next30 reveal dekh:\n${currentResult.mode.icon} ${currentResult.mode.title}\n\nSomething is shifting.\n\nTera kya hai?\nhttps://bit.ly/mememeter`;
        window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
    }

    function downloadCard() {
        if (!dom.exportCard || typeof html2canvas === 'undefined') return;
        const btn = dom.downloadBtn;
        if (btn) btn.disabled = true;

        // Temporarily show the export card
        dom.exportCard.classList.remove('hidden');

        html2canvas(dom.exportCard, {
            backgroundColor: '#06060e',
            scale: 2,
            useCORS: true
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'next30-reveal.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).finally(() => {
            dom.exportCard.classList.add('hidden');
            if (btn) btn.disabled = false;
        });
    }

    function resetFlow() {
        currentResult = null;
        currentStep = 0;
        answers = { mask: null, concern: null, behaviour: null, energy: null };
        dom.resultSection.classList.add('hidden');
        dom.inputSection.classList.remove('hidden');
        renderWizard();
        bindWizardEvents();
        dom.inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ══════════════════════════════════════════════════════════
       EVENT BINDING
       ══════════════════════════════════════════════════════════ */

    function bindWizardEvents() {
        dom.wizardContainer.querySelectorAll('.n30-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const field = btn.dataset.field;
                const value = btn.dataset.value;
                answers[field] = value;

                // Highlight
                btn.closest('.n30-option-grid').querySelectorAll('.n30-option-btn')
                    .forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                // Auto-advance
                setTimeout(() => {
                    if (currentStep < STEPS.length) goToStep(currentStep + 1);
                }, 350);
            });
        });

        const revealBtn = document.getElementById('n30-reveal-btn');
        if (revealBtn) {
            revealBtn.addEventListener('click', () => {
                // Validate
                if (!answers.mask || !answers.concern || !answers.behaviour || !answers.energy) {
                    const missing = !answers.mask ? 0 : !answers.concern ? 1 : !answers.behaviour ? 2 : 3;
                    goToStep(missing);
                    return;
                }
                startLoading();
            });
        }
    }

    /* ══════════════════════════════════════════════════════════
       INIT
       ══════════════════════════════════════════════════════════ */

    function initNext30() {
        dom = {
            inputSection: document.getElementById('n30-input-section'),
            loadingSection: document.getElementById('n30-loading-section'),
            resultSection: document.getElementById('n30-result-section'),
            wizardContainer: document.getElementById('n30-wizard'),
            progressDots: document.getElementById('n30-progress'),
            loadingMsg: document.getElementById('n30-loading-msg'),
            overlay: document.getElementById('n30-overlay'),
            resultCard: document.getElementById('n30-result-card'),
            modeIcon: document.getElementById('n30-mode-icon'),
            modeTitle: document.getElementById('n30-mode-title'),
            blockShift: document.getElementById('n30-block-shift'),
            blockSignal: document.getElementById('n30-block-signal'),
            blockTruth: document.getElementById('n30-block-truth'),
            blockGuidance: document.getElementById('n30-block-guidance'),
            closingLine: document.getElementById('n30-closing'),
            exportCard: document.getElementById('n30-export-card'),
            exportTitle: document.getElementById('n30-export-title'),
            exportSummary: document.getElementById('n30-export-summary'),
            downloadBtn: document.getElementById('n30-download-btn'),
            shareBtn: document.getElementById('n30-share-btn'),
            recalcBtn: document.getElementById('n30-recalc-btn')
        };

        renderWizard();
        bindWizardEvents();

        if (dom.downloadBtn) dom.downloadBtn.addEventListener('click', () => downloadCard());
        if (dom.shareBtn) dom.shareBtn.addEventListener('click', () => shareWhatsApp());
        if (dom.recalcBtn) dom.recalcBtn.addEventListener('click', () => resetFlow());
    }

    return { init: initNext30 };
})();
