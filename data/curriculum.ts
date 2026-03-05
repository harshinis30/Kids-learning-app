import { AgeGroup } from '../services/profileService';

export type ItemType = 'sound' | 'syllable' | 'word';
export type Category = 'animals' | 'food' | 'colors' | 'numbers' | 'shapes' | 'sounds';

export interface CurriculumItem {
    id: string;
    type: ItemType;
    text: string;          // What the child says
    displayText: string;   // What's shown on screen
    phonemes: string;      // IPA pronunciation guide
    emoji: string;
    hint: string;          // Pronunciation tip
    funFact?: string;
    ageGroup: AgeGroup;
    stage: 1 | 2 | 3 | 4;
    category: Category;
    difficulty: 'easy' | 'medium' | 'hard';
    // Which phonemes this item targets (for problem tracking)
    targetPhonemes: string[];
}

// ─── TODDLER CURRICULUM (Ages 2–4) ─────────────────────────────────────────

const toddlerStage1: CurriculumItem[] = [
    // Vowel sounds
    { id: 't1-ah', type: 'sound', text: 'ah', displayText: 'AH', phonemes: 'ɑː', emoji: '😮', hint: 'Open your mouth wide and say "ah"', ageGroup: 'toddler', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['ɑː'] },
    { id: 't1-ee', type: 'sound', text: 'ee', displayText: 'EE', phonemes: 'iː', emoji: '😁', hint: 'Smile big and say "ee"', ageGroup: 'toddler', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['iː'] },
    { id: 't1-oo', type: 'sound', text: 'oo', displayText: 'OO', phonemes: 'uː', emoji: '😙', hint: 'Make a circle with your lips and say "oo"', ageGroup: 'toddler', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['uː'] },
    { id: 't1-oh', type: 'sound', text: 'oh', displayText: 'OH', phonemes: 'oʊ', emoji: '😲', hint: 'Round your lips and say "oh"', ageGroup: 'toddler', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['oʊ'] },
    { id: 't1-ay', type: 'sound', text: 'ay', displayText: 'AY', phonemes: 'eɪ', emoji: '😊', hint: 'Say "a" then "y" together: "ay"', ageGroup: 'toddler', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['eɪ'] },
];

const toddlerStage2: CurriculumItem[] = [
    // Simple syllables
    { id: 't2-ba', type: 'syllable', text: 'ba', displayText: 'BA', phonemes: 'bɑː', emoji: '👶', hint: 'Press your lips together then say "ah": ba!', ageGroup: 'toddler', stage: 2, category: 'sounds', difficulty: 'easy', targetPhonemes: ['b', 'ɑː'] },
    { id: 't2-ma', type: 'syllable', text: 'ma', displayText: 'MA', phonemes: 'mɑː', emoji: '👩', hint: 'Hum "mmm" then open your mouth: ma!', ageGroup: 'toddler', stage: 2, category: 'sounds', difficulty: 'easy', targetPhonemes: ['m', 'ɑː'] },
    { id: 't2-da', type: 'syllable', text: 'da', displayText: 'DA', phonemes: 'dɑː', emoji: '👨', hint: 'Touch your tongue to the top then say "ah": da!', ageGroup: 'toddler', stage: 2, category: 'sounds', difficulty: 'easy', targetPhonemes: ['d', 'ɑː'] },
    { id: 't2-pa', type: 'syllable', text: 'pa', displayText: 'PA', phonemes: 'pɑː', emoji: '🎉', hint: 'Pop your lips and say "ah": pa!', ageGroup: 'toddler', stage: 2, category: 'sounds', difficulty: 'easy', targetPhonemes: ['p', 'ɑː'] },
    { id: 't2-na', type: 'syllable', text: 'na', displayText: 'NA', phonemes: 'nɑː', emoji: '🌙', hint: 'Hum through your nose then say "ah": na!', ageGroup: 'toddler', stage: 2, category: 'sounds', difficulty: 'easy', targetPhonemes: ['n', 'ɑː'] },
    { id: 't2-ta', type: 'syllable', text: 'ta', displayText: 'TA', phonemes: 'tɑː', emoji: '🎵', hint: 'Tap your tongue at the top: ta!', ageGroup: 'toddler', stage: 2, category: 'sounds', difficulty: 'easy', targetPhonemes: ['t', 'ɑː'] },
];

const toddlerStage3: CurriculumItem[] = [
    // Simple CVC words
    { id: 't3-cat', type: 'word', text: 'cat', displayText: 'cat', phonemes: 'kæt', emoji: '🐱', hint: 'Say it in parts: "k" + "at"', funFact: 'Cats purr when they are happy!', ageGroup: 'toddler', stage: 3, category: 'animals', difficulty: 'easy', targetPhonemes: ['k', 'æ', 't'] },
    { id: 't3-dog', type: 'word', text: 'dog', displayText: 'dog', phonemes: 'dɔːɡ', emoji: '🐶', hint: 'Say "d" + "og": dog!', funFact: 'Dogs wag their tails when happy!', ageGroup: 'toddler', stage: 3, category: 'animals', difficulty: 'easy', targetPhonemes: ['d', 'ɔː', 'ɡ'] },
    { id: 't3-cup', type: 'word', text: 'cup', displayText: 'cup', phonemes: 'kʌp', emoji: '☕', hint: 'Say "k" + "up": cup!', ageGroup: 'toddler', stage: 3, category: 'food', difficulty: 'easy', targetPhonemes: ['k', 'ʌ', 'p'] },
    { id: 't3-hat', type: 'word', text: 'hat', displayText: 'hat', phonemes: 'hæt', emoji: '🎩', hint: 'Say "h" + "at": hat!', ageGroup: 'toddler', stage: 3, category: 'colors', difficulty: 'easy', targetPhonemes: ['h', 'æ', 't'] },
    { id: 't3-bed', type: 'word', text: 'bed', displayText: 'bed', phonemes: 'bɛd', emoji: '🛏️', hint: 'Say "b" + "ed": bed!', ageGroup: 'toddler', stage: 3, category: 'shapes', difficulty: 'easy', targetPhonemes: ['b', 'ɛ', 'd'] },
    { id: 't3-sun', type: 'word', text: 'sun', displayText: 'sun', phonemes: 'sʌn', emoji: '☀️', hint: 'Say "s" + "un": sun!', funFact: 'The sun gives us light and warmth!', ageGroup: 'toddler', stage: 3, category: 'colors', difficulty: 'easy', targetPhonemes: ['s', 'ʌ', 'n'] },
    { id: 't3-pig', type: 'word', text: 'pig', displayText: 'pig', phonemes: 'pɪɡ', emoji: '🐷', hint: 'Say "p" + "ig": pig!', funFact: 'Pigs are very smart animals!', ageGroup: 'toddler', stage: 3, category: 'animals', difficulty: 'easy', targetPhonemes: ['p', 'ɪ', 'ɡ'] },
    { id: 't3-red', type: 'word', text: 'red', displayText: 'red', phonemes: 'rɛd', emoji: '🔴', hint: 'Say "r" + "ed": red!', ageGroup: 'toddler', stage: 3, category: 'colors', difficulty: 'easy', targetPhonemes: ['r', 'ɛ', 'd'] },
];

const toddlerStage4: CurriculumItem[] = [
    // Category words - easy
    { id: 't4-apple', type: 'word', text: 'apple', displayText: 'apple', phonemes: 'ˈæp.əl', emoji: '🍎', hint: 'Two parts: "ap" + "ul"', funFact: 'Apples come in red, green, and yellow!', ageGroup: 'toddler', stage: 4, category: 'food', difficulty: 'easy', targetPhonemes: ['æ', 'p', 'ə', 'l'] },
    { id: 't4-ball', type: 'word', text: 'ball', displayText: 'ball', phonemes: 'bɔːl', emoji: '⚽', hint: 'Say "b" + "all": ball!', ageGroup: 'toddler', stage: 4, category: 'shapes', difficulty: 'easy', targetPhonemes: ['b', 'ɔː', 'l'] },
    { id: 't4-fish', type: 'word', text: 'fish', displayText: 'fish', phonemes: 'fɪʃ', emoji: '🐠', hint: 'Say "f" + "ish": fish!', funFact: 'Fish breathe underwater!', ageGroup: 'toddler', stage: 4, category: 'animals', difficulty: 'easy', targetPhonemes: ['f', 'ɪ', 'ʃ'] },
    { id: 't4-blue', type: 'word', text: 'blue', displayText: 'blue', phonemes: 'bluː', emoji: '🔵', hint: 'Say "bl" + "oo": blue!', ageGroup: 'toddler', stage: 4, category: 'colors', difficulty: 'easy', targetPhonemes: ['b', 'l', 'uː'] },
    { id: 't4-one', type: 'word', text: 'one', displayText: 'one', phonemes: 'wʌn', emoji: '1️⃣', hint: 'Say "w" + "un": one!', ageGroup: 'toddler', stage: 4, category: 'numbers', difficulty: 'easy', targetPhonemes: ['w', 'ʌ', 'n'] },
    { id: 't4-two', type: 'word', text: 'two', displayText: 'two', phonemes: 'tuː', emoji: '2️⃣', hint: 'Say "t" + "oo": two!', ageGroup: 'toddler', stage: 4, category: 'numbers', difficulty: 'easy', targetPhonemes: ['t', 'uː'] },
    { id: 't4-star', type: 'word', text: 'star', displayText: 'star', phonemes: 'stɑːr', emoji: '⭐', hint: 'Say "st" + "ar": star!', funFact: 'Stars twinkle in the night sky!', ageGroup: 'toddler', stage: 4, category: 'shapes', difficulty: 'easy', targetPhonemes: ['s', 't', 'ɑː', 'r'] },
    { id: 't4-cake', type: 'word', text: 'cake', displayText: 'cake', phonemes: 'keɪk', emoji: '🎂', hint: 'Say "k" + "ake": cake!', ageGroup: 'toddler', stage: 4, category: 'food', difficulty: 'easy', targetPhonemes: ['k', 'eɪ', 'k'] },
];

// ─── EXPLORER CURRICULUM (Ages 5–7) ─────────────────────────────────────────

const explorerStage1: CurriculumItem[] = [
    // Consonant blends
    { id: 'e1-sh', type: 'sound', text: 'sh', displayText: 'SH', phonemes: 'ʃ', emoji: '🤫', hint: 'Put your finger to your lips and say "shh"', ageGroup: 'explorer', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['ʃ'] },
    { id: 'e1-ch', type: 'sound', text: 'ch', displayText: 'CH', phonemes: 'tʃ', emoji: '🚂', hint: 'Like a train: "ch ch ch"', ageGroup: 'explorer', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['tʃ'] },
    { id: 'e1-th', type: 'sound', text: 'th', displayText: 'TH', phonemes: 'θ', emoji: '👅', hint: 'Put your tongue between your teeth and blow', ageGroup: 'explorer', stage: 1, category: 'sounds', difficulty: 'medium', targetPhonemes: ['θ'] },
    { id: 'e1-bl', type: 'syllable', text: 'bl', displayText: 'BL', phonemes: 'bl', emoji: '💙', hint: 'Say "b" and "l" together quickly', ageGroup: 'explorer', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['b', 'l'] },
    { id: 'e1-cr', type: 'syllable', text: 'cr', displayText: 'CR', phonemes: 'kr', emoji: '🦀', hint: 'Say "k" and "r" together: cr!', ageGroup: 'explorer', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['k', 'r'] },
    { id: 'e1-gr', type: 'syllable', text: 'gr', displayText: 'GR', phonemes: 'ɡr', emoji: '🌱', hint: 'Say "g" and "r" together: gr!', ageGroup: 'explorer', stage: 1, category: 'sounds', difficulty: 'easy', targetPhonemes: ['ɡ', 'r'] },
];

const explorerStage2: CurriculumItem[] = [
    // Digraphs
    { id: 'e2-wh', type: 'sound', text: 'wh', displayText: 'WH', phonemes: 'w', emoji: '🌬️', hint: 'Blow air and say "w": wh!', ageGroup: 'explorer', stage: 2, category: 'sounds', difficulty: 'medium', targetPhonemes: ['w'] },
    { id: 'e2-ph', type: 'sound', text: 'ph', displayText: 'PH', phonemes: 'f', emoji: '📞', hint: 'PH makes an "f" sound: ph = f', ageGroup: 'explorer', stage: 2, category: 'sounds', difficulty: 'medium', targetPhonemes: ['f'] },
    { id: 'e2-ng', type: 'sound', text: 'ng', displayText: 'NG', phonemes: 'ŋ', emoji: '🔔', hint: 'Hum through your nose at the back: ng!', ageGroup: 'explorer', stage: 2, category: 'sounds', difficulty: 'medium', targetPhonemes: ['ŋ'] },
    { id: 'e2-ck', type: 'sound', text: 'ck', displayText: 'CK', phonemes: 'k', emoji: '🔑', hint: 'CK makes a "k" sound at the end of words', ageGroup: 'explorer', stage: 2, category: 'sounds', difficulty: 'easy', targetPhonemes: ['k'] },
    { id: 'e2-oi', type: 'sound', text: 'oi', displayText: 'OI', phonemes: 'ɔɪ', emoji: '🛢️', hint: 'Say "oh" then "ee" quickly: oi!', ageGroup: 'explorer', stage: 2, category: 'sounds', difficulty: 'medium', targetPhonemes: ['ɔɪ'] },
];

const explorerStage3: CurriculumItem[] = [
    // 2-syllable words
    { id: 'e3-apple', type: 'word', text: 'apple', displayText: 'apple', phonemes: 'ˈæp.əl', emoji: '🍎', hint: 'Two parts: "AP" + "ul"', funFact: 'There are over 7,500 types of apples!', ageGroup: 'explorer', stage: 3, category: 'food', difficulty: 'easy', targetPhonemes: ['æ', 'p', 'ə', 'l'] },
    { id: 'e3-happy', type: 'word', text: 'happy', displayText: 'happy', phonemes: 'ˈhæp.i', emoji: '😊', hint: 'Two parts: "HAP" + "ee"', ageGroup: 'explorer', stage: 3, category: 'colors', difficulty: 'easy', targetPhonemes: ['h', 'æ', 'p', 'i'] },
    { id: 'e3-tiger', type: 'word', text: 'tiger', displayText: 'tiger', phonemes: 'ˈtaɪ.ɡər', emoji: '🐯', hint: 'Two parts: "TY" + "ger"', funFact: 'Tigers are the largest wild cats!', ageGroup: 'explorer', stage: 3, category: 'animals', difficulty: 'medium', targetPhonemes: ['t', 'aɪ', 'ɡ', 'ər'] },
    { id: 'e3-bunny', type: 'word', text: 'bunny', displayText: 'bunny', phonemes: 'ˈbʌn.i', emoji: '🐰', hint: 'Two parts: "BUN" + "ee"', funFact: 'Bunnies can jump very high!', ageGroup: 'explorer', stage: 3, category: 'animals', difficulty: 'easy', targetPhonemes: ['b', 'ʌ', 'n', 'i'] },
    { id: 'e3-yellow', type: 'word', text: 'yellow', displayText: 'yellow', phonemes: 'ˈjɛl.oʊ', emoji: '💛', hint: 'Two parts: "YEL" + "oh"', ageGroup: 'explorer', stage: 3, category: 'colors', difficulty: 'easy', targetPhonemes: ['j', 'ɛ', 'l', 'oʊ'] },
    { id: 'e3-purple', type: 'word', text: 'purple', displayText: 'purple', phonemes: 'ˈpɜːr.pəl', emoji: '💜', hint: 'Two parts: "PUR" + "pul"', ageGroup: 'explorer', stage: 3, category: 'colors', difficulty: 'medium', targetPhonemes: ['p', 'ɜː', 'r', 'p', 'ə', 'l'] },
    { id: 'e3-seven', type: 'word', text: 'seven', displayText: 'seven', phonemes: 'ˈsɛv.ən', emoji: '7️⃣', hint: 'Two parts: "SEV" + "en"', ageGroup: 'explorer', stage: 3, category: 'numbers', difficulty: 'easy', targetPhonemes: ['s', 'ɛ', 'v', 'ə', 'n'] },
    { id: 'e3-circle', type: 'word', text: 'circle', displayText: 'circle', phonemes: 'ˈsɜːr.kəl', emoji: '⭕', hint: 'Two parts: "SUR" + "kul"', ageGroup: 'explorer', stage: 3, category: 'shapes', difficulty: 'medium', targetPhonemes: ['s', 'ɜː', 'r', 'k', 'ə', 'l'] },
];

const explorerStage4: CurriculumItem[] = [
    // All categories - medium + hard
    { id: 'e4-elephant', type: 'word', text: 'elephant', displayText: 'elephant', phonemes: 'ˈɛl.ɪ.fənt', emoji: '🐘', hint: 'Three parts: "EL" + "i" + "funt"', funFact: 'Elephants never forget!', ageGroup: 'explorer', stage: 4, category: 'animals', difficulty: 'hard', targetPhonemes: ['ɛ', 'l', 'ɪ', 'f', 'ə', 'n', 't'] },
    { id: 'e4-strawberry', type: 'word', text: 'strawberry', displayText: 'strawberry', phonemes: 'ˈstrɔː.bɛr.i', emoji: '🍓', hint: 'Three parts: "STRAW" + "ber" + "ee"', funFact: 'Strawberries are the only fruit with seeds on the outside!', ageGroup: 'explorer', stage: 4, category: 'food', difficulty: 'hard', targetPhonemes: ['s', 't', 'r', 'ɔː', 'b', 'ɛ', 'r', 'i'] },
    { id: 'e4-triangle', type: 'word', text: 'triangle', displayText: 'triangle', phonemes: 'ˈtraɪ.æŋ.ɡəl', emoji: '🔺', hint: 'Three parts: "TRY" + "ang" + "gul"', ageGroup: 'explorer', stage: 4, category: 'shapes', difficulty: 'hard', targetPhonemes: ['t', 'r', 'aɪ', 'æ', 'ŋ', 'ɡ', 'ə', 'l'] },
    { id: 'e4-orange', type: 'word', text: 'orange', displayText: 'orange', phonemes: 'ˈɒr.ɪndʒ', emoji: '🟠', hint: 'Two parts: "OR" + "inj"', ageGroup: 'explorer', stage: 4, category: 'colors', difficulty: 'medium', targetPhonemes: ['ɒ', 'r', 'ɪ', 'n', 'dʒ'] },
    { id: 'e4-fourteen', type: 'word', text: 'fourteen', displayText: 'fourteen', phonemes: 'ˌfɔːrˈtiːn', emoji: '🔢', hint: 'Two parts: "FOR" + "teen"', ageGroup: 'explorer', stage: 4, category: 'numbers', difficulty: 'medium', targetPhonemes: ['f', 'ɔː', 'r', 't', 'iː', 'n'] },
    { id: 'e4-butterfly', type: 'word', text: 'butterfly', displayText: 'butterfly', phonemes: 'ˈbʌt.ər.flaɪ', emoji: '🦋', hint: 'Three parts: "BUT" + "er" + "fly"', funFact: 'Butterflies taste with their feet!', ageGroup: 'explorer', stage: 4, category: 'animals', difficulty: 'hard', targetPhonemes: ['b', 'ʌ', 't', 'ər', 'f', 'l', 'aɪ'] },
    { id: 'e4-chocolate', type: 'word', text: 'chocolate', displayText: 'chocolate', phonemes: 'ˈtʃɒk.lɪt', emoji: '🍫', hint: 'Three parts: "CHOK" + "ul" + "it"', ageGroup: 'explorer', stage: 4, category: 'food', difficulty: 'hard', targetPhonemes: ['tʃ', 'ɒ', 'k', 'l', 'ɪ', 't'] },
    { id: 'e4-rectangle', type: 'word', text: 'rectangle', displayText: 'rectangle', phonemes: 'ˈrɛk.tæŋ.ɡəl', emoji: '▬', hint: 'Three parts: "REK" + "tang" + "gul"', ageGroup: 'explorer', stage: 4, category: 'shapes', difficulty: 'hard', targetPhonemes: ['r', 'ɛ', 'k', 't', 'æ', 'ŋ', 'ɡ', 'ə', 'l'] },
];

// ─── FULL CURRICULUM ─────────────────────────────────────────────────────────

export const CURRICULUM: CurriculumItem[] = [
    ...toddlerStage1,
    ...toddlerStage2,
    ...toddlerStage3,
    ...toddlerStage4,
    ...explorerStage1,
    ...explorerStage2,
    ...explorerStage3,
    ...explorerStage4,
];

export function getStageItems(ageGroup: AgeGroup, stage: 1 | 2 | 3 | 4): CurriculumItem[] {
    return CURRICULUM.filter(item => item.ageGroup === ageGroup && item.stage === stage);
}

export function getCategoryItems(ageGroup: AgeGroup, stage: 1 | 2 | 3 | 4, category: Category): CurriculumItem[] {
    return CURRICULUM.filter(item => item.ageGroup === ageGroup && item.stage === stage && item.category === category);
}

export function getItemById(id: string): CurriculumItem | undefined {
    return CURRICULUM.find(item => item.id === id);
}

export const STAGE_NAMES: Record<number, string> = {
    1: 'First Sounds',
    2: 'Sound Blends',
    3: 'Simple Words',
    4: 'Word Explorer',
};

export const STAGE_DESCRIPTIONS: Record<AgeGroup, Record<number, string>> = {
    toddler: {
        1: 'Learning vowel sounds: ah, ee, oo',
        2: 'Learning syllables: ba, ma, da',
        3: 'Learning simple words: cat, dog, cup',
        4: 'Exploring word categories',
    },
    explorer: {
        1: 'Learning sound blends: sh, ch, th',
        2: 'Learning digraphs: wh, ph, ng',
        3: 'Learning 2-syllable words',
        4: 'Mastering all word categories',
    },
};

export const STAGE_REQUIRED_STARS: Record<number, number> = {
    1: 10, // Need 10 stars to unlock Stage 2
    2: 15, // Need 15 stars to unlock Stage 3
    3: 20, // Need 20 stars to unlock Stage 4
    4: 0,  // No unlock needed
};
