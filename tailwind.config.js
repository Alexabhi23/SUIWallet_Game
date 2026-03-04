/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                space: {
                    900: '#050510',
                    800: '#0f0f20',
                    700: '#1a1a36',
                },
                neon: {
                    purple: '#9333ea',
                    purpleGlow: 'rgba(147, 51, 234, 0.5)',
                    cyan: '#06b6d4',
                    cyanGlow: 'rgba(6, 182, 212, 0.5)',
                    gold: '#fbbf24',
                    goldGlow: 'rgba(251, 191, 36, 0.5)'
                }
            },
            boxShadow: {
                'neon-purple': '0 0 20px rgba(168,85,247,0.5)',
                'neon-cyan': '0 0 20px rgba(34,211,238,0.5)',
                'neon-gold': '0 0 20px rgba(251,191,36,0.6)',
                'neon-pink': '0 0 20px rgba(236,72,153,0.5)',
                'glass': '0 8px 32px rgba(0,0,0,0.4)',
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'spin-slow': 'spin 8s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
            },
        },
    },
    plugins: [],
}
