import { Rarity, RARITY_CONFIG } from '../constants';

interface Props {
    rarity: Rarity;
    size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
};

export default function RarityBadge({ rarity, size = 'md' }: Props) {
    const cfg = RARITY_CONFIG[rarity];

    return (
        <span
            className={`
        inline-flex items-center gap-1 font-bold rounded-full uppercase tracking-wider
        ${SIZE_CLASSES[size]}
      `}
            style={{
                background: `linear-gradient(135deg, ${cfg.color}33, ${cfg.color}22)`,
                border: `1px solid ${cfg.color}66`,
                color: cfg.color,
                boxShadow: cfg.glow,
            }}
        >
            {rarity === 'Legendary' && <span>✦</span>}
            {rarity === 'Epic' && <span>◆</span>}
            {rarity === 'Rare' && <span>●</span>}
            {rarity === 'Common' && <span>○</span>}
            {cfg.label}
        </span>
    );
}
