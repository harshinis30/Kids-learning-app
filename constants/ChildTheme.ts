// Child-friendly theme colors and styles
export const ChildTheme = {
    colors: {
        // Primary vibrant colors
        primary: '#FF6B9D',      // Pink
        secondary: '#4ECDC4',    // Turquoise
        accent: '#FFE66D',       // Yellow
        success: '#95E1D3',      // Mint green
        warning: '#FFA07A',      // Light salmon

        // Background gradients
        backgroundStart: '#667eea',
        backgroundEnd: '#764ba2',

        // UI elements
        cardBackground: 'rgba(255, 255, 255, 0.95)',
        buttonPrimary: '#FF6B9D',
        buttonSecondary: '#4ECDC4',

        // Text
        textPrimary: '#2D3436',
        textSecondary: '#636E72',
        textLight: '#FFFFFF',

        // Status colors
        correct: '#00D084',
        incorrect: '#FF6B6B',
        neutral: '#A8DADC',
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    borderRadius: {
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        round: 999,
    },

    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 20,
        xl: 24,
        xxl: 32,
        huge: 48,
    },

    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
        },
    },
};
