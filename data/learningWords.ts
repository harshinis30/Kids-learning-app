// Basic kid words for pronunciation learning
export interface LearningWord {
    id: string;
    word: string;
    phonemes: string; // IPA format
    difficulty: 'easy' | 'medium' | 'hard';
    ageGroup: '2-4' | '4-6' | '6-7';
    emoji: string;
}

export const learningWords: LearningWord[] = [
    // Easy Words (Ages 2-4)
    {
        id: 'apple',
        word: 'apple',
        phonemes: 'ˈæp.əl',
        difficulty: 'easy',
        ageGroup: '2-4',
        emoji: '🍎'
    },
    {
        id: 'ball',
        word: 'ball',
        phonemes: 'bɔːl',
        difficulty: 'easy',
        ageGroup: '2-4',
        emoji: '⚽'
    },
    {
        id: 'cat',
        word: 'cat',
        phonemes: 'kæt',
        difficulty: 'easy',
        ageGroup: '2-4',
        emoji: '🐱'
    },
    {
        id: 'dog',
        word: 'dog',
        phonemes: 'dɔːɡ',
        difficulty: 'easy',
        ageGroup: '2-4',
        emoji: '🐶'
    },

    // Medium Words (Ages 4-6)
    {
        id: 'elephant',
        word: 'elephant',
        phonemes: 'ˈel.ɪ.fənt',
        difficulty: 'medium',
        ageGroup: '4-6',
        emoji: '🐘'
    },
    {
        id: 'fish',
        word: 'fish',
        phonemes: 'fɪʃ',
        difficulty: 'medium',
        ageGroup: '4-6',
        emoji: '🐠'
    },
    {
        id: 'goat',
        word: 'goat',
        phonemes: 'ɡoʊt',
        difficulty: 'medium',
        ageGroup: '4-6',
        emoji: '🐐'
    },
    {
        id: 'hat',
        word: 'hat',
        phonemes: 'hæt',
        difficulty: 'medium',
        ageGroup: '4-6',
        emoji: '🎩'
    },

    // Harder Words (Ages 6-7)
    {
        id: 'ice-cream',
        word: 'ice cream',
        phonemes: 'aɪs kriːm',
        difficulty: 'hard',
        ageGroup: '6-7',
        emoji: '🍦'
    },
    {
        id: 'juice',
        word: 'juice',
        phonemes: 'dʒuːs',
        difficulty: 'hard',
        ageGroup: '6-7',
        emoji: '🧃'
    }
];

// Get words by difficulty
export const getWordsByDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    return learningWords.filter(word => word.difficulty === difficulty);
};

// Get words by age group
export const getWordsByAgeGroup = (ageGroup: '2-4' | '4-6' | '6-7') => {
    return learningWords.filter(word => word.ageGroup === ageGroup);
};

// Get random word
export const getRandomWord = () => {
    return learningWords[Math.floor(Math.random() * learningWords.length)];
};
