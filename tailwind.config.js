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
                'neon-purple': '#a855f7',
                'neon-cyan': '#22d3ee',
                'neon-gold': '#fbbf24',
                'neon-pink': '#ec4899',
                'neon-green': '#4ade80',
                'glass': 'rgba(255,255,255,0.05)',
                'glass-border': 'rgba(255,255,255,0.12)',
                'dark-900': '#080818',
                'dark-800': '#0d0d2b',
                'dark-700': '#12122f',
                'dark-600': '#1a1a3f',
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
