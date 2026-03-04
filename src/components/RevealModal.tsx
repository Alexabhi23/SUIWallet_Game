import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rarity, RARITY_CONFIG } from '../constants';
import RarityBadge from './RarityBadge';

export interface RevealItem {
    rarity: Rarity;
    powerLevel: number;
    name: string;
    objectId: string;
    imageUrl?: string;
}

interface Props {
    item: RevealItem | null;
    onClose: () => void;
}

/** Generates a deterministic avatar URL for a game item */
const getItemImage = (item: RevealItem) => {
    if (item.imageUrl) return item.imageUrl;
    // Use a placeholder gradient SVG data URI
    const colors: Record<Rarity, [string, string]> = {
        Common: ['#64748b', '#94a3b8'],
        Rare: ['#1d4ed8', '#60a5fa'],
        Epic: ['#6d28d9', '#c084fc'],
        Legendary: ['#b45309', '#fbbf24'],
    };
    const [c1, c2] = colors[item.rarity];
    return `https://api.dicebear.com/9.x/shapes/svg?seed=${item.objectId}&backgroundColor=${c1.replace('#', '')}&backgroundType=gradientLinear`;
};

/** Floating particle */
function Particle({ color, delay }: { color: string; delay: number }) {
    const angle = Math.random() * 360;
    const distance = 80 + Math.random() * 120;
    const x = Math.cos((angle * Math.PI) / 180) * distance;
    const y = Math.sin((angle * Math.PI) / 180) * distance;

    return (
        <motion.div
            className="absolute w-2 h-2 rounded-full"
            style={{ backgroundColor: color, top: '50%', left: '50%' }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x, y, scale: 0, opacity: 0 }}
            transition={{ duration: 1.2, delay, ease: 'easeOut' }}
        />
    );
}

export default function RevealModal({ item, onClose }: Props) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <AnimatePresence>
            {item && (
                <motion.div
                    ref={overlayRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Item Reveal"
                    id="reveal-modal"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
                    style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
                >
                    {/* Stars background */}
                    {Array.from({ length: 30 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-0.5 h-0.5 rounded-full bg-white"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                opacity: Math.random() * 0.6 + 0.2,
                            }}
                            animate={{ opacity: [0.2, 0.8, 0.2] }}
                            transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
                        />
                    ))}

                    <motion.div
                        className="relative glass-card p-8 max-w-md w-full text-center overflow-hidden"
                        style={{
                            border: `1px solid ${RARITY_CONFIG[item.rarity].color}66`,
                            boxShadow: RARITY_CONFIG[item.rarity].glow,
                        }}
                        initial={{ scale: 0.5, rotateY: -90, opacity: 0 }}
                        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                    >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 shimmer-bg pointer-events-none" />

                        {/* Particles burst */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                            {Array.from({ length: 16 }).map((_, i) => (
                                <Particle key={i} color={RARITY_CONFIG[item.rarity].color} delay={i * 0.04} />
                            ))}
                        </div>

                        {/* Rarity banner */}
                        <motion.div
                            className="absolute top-0 left-0 right-0 h-1"
                            style={{ background: `linear-gradient(90deg, transparent, ${RARITY_CONFIG[item.rarity].color}, transparent)` }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                        />

                        {/* Title */}
                        <motion.p
                            className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 mb-4"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            ✦ Item Revealed ✦
                        </motion.p>

                        {/* Item image */}
                        <motion.div
                            className="relative mx-auto mb-6 w-40 h-40 rounded-2xl overflow-hidden"
                            style={{ boxShadow: RARITY_CONFIG[item.rarity].glow }}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.3 }}
                        >
                            <img
                                src={getItemImage(item)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='${encodeURIComponent(RARITY_CONFIG[item.rarity].color)}'/><stop offset='100%25' stop-color='%23080818'/></linearGradient></defs><rect width='160' height='160' fill='url(%23g)'/><text x='50%25' y='55%25' font-size='60' text-anchor='middle' dominant-baseline='middle'>⚔️</text></svg>`;
                                }}
                            />
                            <div className="absolute inset-0 shimmer-bg" />
                        </motion.div>

                        {/* Item name */}
                        <motion.h3
                            className="text-2xl font-extrabold text-white mb-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            {item.name}
                        </motion.h3>

                        {/* Rarity badge */}
                        <motion.div
                            className="flex justify-center mb-4"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, type: 'spring' }}
                        >
                            <RarityBadge rarity={item.rarity} size="lg" />
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            className="flex items-center justify-center gap-6 mb-6"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            <div className="text-center">
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Power Level</p>
                                <p className="text-3xl font-black" style={{ color: RARITY_CONFIG[item.rarity].color }}>
                                    {item.powerLevel}
                                </p>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="text-center">
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Object ID</p>
                                <p className="text-xs font-mono text-slate-400">
                                    {item.objectId.slice(0, 8)}…
                                </p>
                            </div>
                        </motion.div>

                        {/* Close button */}
                        <motion.button
                            id="reveal-modal-close"
                            onClick={onClose}
                            className="w-full py-3 rounded-xl font-bold text-white transition-all duration-300"
                            style={{
                                background: `linear-gradient(135deg, ${RARITY_CONFIG[item.rarity].color}cc, ${RARITY_CONFIG[item.rarity].color}66)`,
                                boxShadow: RARITY_CONFIG[item.rarity].glow,
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Claim & Continue →
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
