// Dateme content tables — tone strings + personality bucketing + the two
// question stages. Pure data; no DOM, no state mutation. Imported by
// dateme.ts and dateme-flow.ts.

export const toneContent = {
    0: {
        label: "Playing it cool",
        title: "If you want to, no pressure",
        subtitle: "I mean, I'm pretty busy anyway.",
        cta: "Sure, why not →",
        guarantee: "I'll probably respond. Eventually.",
        noteLabel: "Say something if you feel like it",
        notePlaceholder: "Or don't. I'm not your boss."
    },
    1: {
        label: "Mildly interested",
        title: "I'd be down to chat",
        subtitle: "You seem cool. Let's see what happens.",
        cta: "Let's do this →",
        guarantee: "I'll text you within 48 hours.",
        noteLabel: "Tell me something interesting",
        notePlaceholder: "Impress me. Or don't. But do."
    },
    2: {
        label: "Genuinely interested",
        title: "I actually want to hear from you",
        subtitle: "You made it this far. I'm curious about you.",
        cta: "Send it to Jevan →",
        guarantee: "I respond to everyone. Within 24 hours. Personally.",
        noteLabel: "Say something that'll make me smile",
        notePlaceholder: "A joke, a question, literally anything..."
    },
    3: {
        label: "Very interested",
        title: "Okay I'm kind of excited about this",
        subtitle: "Your answers were actually really good??",
        cta: "PLEASE send this →",
        guarantee: "I will 100% text you TODAY. I promise. Pinky swear.",
        noteLabel: "Quick, say something before I overthink this",
        notePlaceholder: "Anything. I'm already composing my first text to you."
    },
    4: {
        label: "Completely unhinged",
        title: "I'M BEGGING YOU",
        subtitle: "I have SO many dad jokes saved up. Please.",
        cta: "🚨 SEND IMMEDIATELY 🚨",
        guarantee: "I will text you in the next 30 SECONDS. I'm already typing. This is not a drill.",
        noteLabel: "SAY LITERALLY ANYTHING",
        notePlaceholder: "JUST HIT SEND I'M LOSING MY MIND OVER HERE"
    }
};

export const personalityMap = {
    pineapple: {
        yes: { trait: 'Adventurous', desc: 'You embrace the unconventional' },
        no: { trait: 'Traditional', desc: 'You know what you like' },
        drunk: { trait: 'Flexible', desc: 'Context matters to you' },
        never: { trait: 'Mysterious', desc: 'Full of surprises' }
    },
    loveLanguage: {
        words: { trait: 'Expressive', weight: 15 },
        touch: { trait: 'Affectionate', weight: 15 },
        time: { trait: 'Present', weight: 20 },
        gifts: { trait: 'Thoughtful', weight: 10 },
        service: { trait: 'Caring', weight: 15 }
    },
    social: {
        extrovert: { trait: 'Life of the party', weight: 10 },
        introvert: { trait: 'Deep connector', weight: 15 },
        ambivert: { trait: 'Adaptable', weight: 20 },
        selective: { trait: 'Intentional', weight: 15 }
    }
};

export const stage1Questions = [
    {
        id: 'pineapple',
        question: "Okay, let's settle this once and for all...",
        subtext: "Your answer says more about you than you think",
        type: 'choice',
        options: [
            { text: "Pineapple on pizza? YES. Fight me.", value: 'yes', pass: true, reaction: "Bold. I respect it." },
            { text: "Pineapple on pizza is a crime", value: 'no', pass: true, reaction: "A purist. Classic." },
            { text: "Only after 2am or 3+ drinks", value: 'drunk', pass: true, reaction: "Ah, situational ethics." },
            { text: "Wait, is pizza the flat bread thing?", value: 'never', pass: true, reaction: "...interesting." }
        ],
        failMessage: null
    },
    {
        id: 'age',
        question: "Quick logistics check",
        subtext: "No judgment, just math",
        type: 'choice',
        options: [
            { text: "I'm 21-24", value: '21-24', pass: true, reaction: "Perfect." },
            { text: "I'm 25-28", value: '25-28', pass: true, reaction: "Perfect." },
            { text: "I'm under 21", value: 'under21', pass: false },
            { text: "I'm 29+", value: '29+', pass: false }
        ],
        failMessage: {
            title: "Timing is everything",
            text: "You seem genuinely cool, but I'm looking for someone at a similar life stage right now. Nothing personal—just where I'm at.",
            subtext: "The universe has other plans for us, and that's okay.",
            emoji: "🌙",
            buttons: [
                { text: "I get it. Show me your essays", link: "essays.html", primary: true },
                { text: "Let me try again", action: 'restart' }
            ]
        }
    },
    {
        id: 'humor',
        question: "A massive spider appears in your apartment. Your move?",
        subtext: "There are wrong answers here",
        type: 'choice',
        options: [
            { text: "Burn the building down. Insurance will understand.", value: 'burn', pass: true, reaction: "Proportional response." },
            { text: "Name it Gerald. We live together now.", value: 'pet', pass: true, reaction: "Chaotic energy. I like it." },
            { text: "Scream. Dramatically. Until someone saves me.", value: 'scream', pass: true, reaction: "Valid. Very valid." },
            { text: "Calmly escort it outside. It's just a spider.", value: 'calm', pass: false }
        ],
        failMessage: {
            title: "About that spider...",
            text: "Look, I need someone who can appreciate that a spider in the apartment is basically a home invasion. Your calmness concerns me.",
            subtext: "We might be too different on the things that matter most (spiders).",
            emoji: "🕷️",
            buttons: [
                { text: "Here's a song to soften the blow", link: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", primary: true, external: true },
                { text: "Fine, I'll pretend to be scared", action: 'restart' }
            ]
        }
    },
    {
        id: 'spontaneous',
        question: "It's 2am. I text: 'Found the best taco truck. You in?'",
        subtext: "This is a test",
        type: 'choice',
        options: [
            { text: "Already putting on pants. Send location.", value: 'yes', pass: true, reaction: "This is the energy I need." },
            { text: "I'm asleep but... fine. For tacos.", value: 'reluctant', pass: true, reaction: "The 'fine' sold me." },
            { text: "Screenshot this. I'll meet you tomorrow.", value: 'tomorrow', pass: true, reaction: "Practical. I can work with that." },
            { text: "Why are you texting me at 2am?", value: 'no', pass: false }
        ],
        failMessage: {
            title: "The tacos were incredible, btw",
            text: "I understand boundaries. I respect sleep schedules. But life's best moments happen at 2am with questionable food decisions.",
            subtext: "We might just be on different wavelengths, and that's okay.",
            emoji: "🌮",
            buttons: [
                { text: "You're right, I'm boring", action: 'restart' },
                { text: "I stand by my sleep schedule", link: "index.html", primary: true }
            ]
        }
    },
    {
        id: 'values',
        question: "Honestly, what matters most in a partner?",
        subtext: "Pick the one that's most true",
        type: 'choice',
        options: [
            { text: "Making me laugh so hard I forget my problems", value: 'humor', pass: true, reaction: "Same. 100% same." },
            { text: "Having goals and actually chasing them", value: 'ambition', pass: true, reaction: "Drive is attractive." },
            { text: "Being genuinely kind to strangers", value: 'kindness', pass: true, reaction: "The real green flag." },
            { text: "Let's be real—financial stability", value: 'money', pass: false }
        ],
        failMessage: {
            title: "Plot twist incoming",
            text: "I spent my rent money on this website. Twice. I'm rich in enthusiasm and dad jokes, but my bank account tells a different story.",
            subtext: "We want different things, and I respect that.",
            emoji: "💸",
            buttons: [
                { text: "Okay that's actually funny", action: 'restart' },
                { text: "Best of luck out there", link: "index.html", primary: true }
            ]
        }
    }
];

export const stage2Questions = [
    {
        id: 'loveLanguage',
        question: "How do you know someone really loves you?",
        subtext: "No wrong answers now—I just want to understand you",
        type: 'choice',
        options: [
            { text: "They tell me. Often. With words.", value: 'words' },
            { text: "They're physically close. Holding hands, hugs, all of it.", value: 'touch' },
            { text: "They give me their undivided attention.", value: 'time' },
            { text: "They remember the little things and surprise me.", value: 'gifts' },
            { text: "They do things for me without being asked.", value: 'service' }
        ]
    },
    {
        id: 'sunday',
        question: "Paint me a picture of your ideal Sunday",
        subtext: "No judgment—unless you say 'productivity'",
        type: 'choice',
        options: [
            { text: "Brunch that accidentally becomes dinner", value: 'brunch' },
            { text: "Gym, farmers market, pretending I'm in a movie", value: 'active' },
            { text: "Absolutely nothing until at least 2pm", value: 'lazy' },
            { text: "Some random adventure I haven't planned yet", value: 'spontaneous' },
            { text: "Coffee, a book, and pretending the world doesn't exist", value: 'cozy' }
        ]
    },
    {
        id: 'controversial',
        question: "Give me your hottest take",
        subtext: "The more controversial, the more I'll like you",
        type: 'text',
        placeholder: "Pineapple was just the warm-up...",
        maxLength: 140
    },
    {
        id: 'fiveYears',
        question: "In 5 years, where does your life look?",
        subtext: "Dream big or keep it real—your call",
        type: 'choice',
        options: [
            { text: "Running something I built myself", value: 'entrepreneur' },
            { text: "Leading a team and making moves", value: 'corporate' },
            { text: "Creating things that didn't exist before", value: 'creative' },
            { text: "Somewhere with better weather than here", value: 'abroad' },
            { text: "Figuring it out as I go (the honest answer)", value: 'uncertain' }
        ]
    },
    {
        id: 'dealbreaker',
        question: "What's a subtle red flag most people miss?",
        subtext: "Teach me something",
        type: 'text',
        placeholder: "The wisdom I didn't know I needed...",
        maxLength: 140
    },
    {
        id: 'social',
        question: "At a party, you're most likely to be...",
        subtext: "Be honest—I'll find out eventually",
        type: 'choice',
        options: [
            { text: "In the center, probably telling a story", value: 'extrovert' },
            { text: "Having a deep conversation in the corner", value: 'introvert' },
            { text: "Depends entirely on my mood that day", value: 'ambivert' },
            { text: "Leaving early but making it count while I'm there", value: 'selective' }
        ]
    },
    {
        id: 'kids',
        question: "Kids? (Someday. Not like, next week.)",
        subtext: "There's no wrong answer here either",
        type: 'choice',
        options: [
            { text: "Yes—I want the chaos", value: 'yes' },
            { text: "Maybe? Ask me in 5 years", value: 'maybe' },
            { text: "Probably not my path", value: 'probably_not' },
            { text: "Hard no. I am the fun aunt/uncle.", value: 'no' }
        ]
    },
    {
        id: 'zodiac',
        question: "What's your sign? (I have to ask)",
        subtext: "Don't worry—I won't actually judge you by it. Much.",
        type: 'choice',
        options: [
            { text: "Aries ♈", value: 'aries' },
            { text: "Taurus ♉", value: 'taurus' },
            { text: "Gemini ♊", value: 'gemini' },
            { text: "Cancer ♋", value: 'cancer' },
            { text: "Leo ♌", value: 'leo' },
            { text: "Virgo ♍", value: 'virgo' },
            { text: "Libra ♎", value: 'libra' },
            { text: "Scorpio ♏", value: 'scorpio' },
            { text: "Sagittarius ♐", value: 'sagittarius' },
            { text: "Capricorn ♑", value: 'capricorn' },
            { text: "Aquarius ♒", value: 'aquarius' },
            { text: "Pisces ♓", value: 'pisces' },
            { text: "I think astrology is nonsense", value: 'skeptic' }
        ]
    }
];

