import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LOOT_BOX_MODULE, GAME_CONFIG_ID, RANDOM_OBJECT_ID,
    Rarity
} from '../constants';
import RevealModal, { RevealItem } from './RevealModal';

interface Props {
    lootBoxObjectId: string;
    onOpened: () => void;   // refresh parent list
}

type OpenState = 'idle' | 'shaking' | 'opening' | 'revealed' | 'error';

/** Parse event data from transaction effects */
function parseRevealFromEvents(
    events: Array<{ type: string; parsedJson?: Record<string, unknown> }>,
    fallbackObjectId: string
): RevealItem {
    const event = events.find(e => e.type.includes('LootBoxOpened'));
    const data = (event?.parsedJson ?? {}) as Record<string, unknown>;

    const rarityMap: Record<number, Rarity> = { 0: 'Common', 1: 'Rare', 2: 'Epic', 3: 'Legendary' };
    const rarityNum = typeof data.rarity === 'number' ? data.rarity : 0;
    const rarity: Rarity = rarityMap[rarityNum] ?? 'Common';

    return {
        rarity,
        powerLevel: typeof data.power_level === 'number' ? data.power_level : Math.floor(Math.random() * 90) + 10,
        name: `${rarity} Blade #${Math.floor(Math.random() * 9999)}`,
        objectId: typeof data.item_id === 'string' ? data.item_id : fallbackObjectId,
    };
}

export default function OpeningAnimation({ lootBoxObjectId, onOpened }: Props) {
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const [openState, setOpenState] = useState<OpenState>('idle');
    const [revealItem, setRevealItem] = useState<RevealItem | null>(null);

    const handleOpen = () => {
        setOpenState('shaking');

        // Build the transaction
        const tx = new Transaction();
        tx.moveCall({
            target: `${LOOT_BOX_MODULE}::open_loot_box`,
            arguments: [
                tx.object(GAME_CONFIG_ID),
                tx.object(lootBoxObjectId),
                tx.object(RANDOM_OBJECT_ID),
            ],
        });

        // Wait for shake animation, then fire tx
        setTimeout(() => {
            setOpenState('opening');
            signAndExecute(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { transaction: tx as any },
                {
                    onSuccess: async (result) => {
                        // Try to get full events from client
                        let events: Array<{ type: string; parsedJson?: Record<string, unknown> }> = [];
                        try {
                            const txData = await suiClient.getTransactionBlock({
                                digest: result.digest,
                                options: { showEvents: true },
                            });
                            events = (txData.events ?? []) as typeof events;
                        } catch {
                            events = (result as unknown as { events?: typeof events }).events ?? [];
                        }

                        const item = parseRevealFromEvents(events, lootBoxObjectId);
                        setRevealItem(item);
                        setOpenState('revealed');
                    },
                    onError: (err) => {
                        console.error('Open failed:', err);
                        setOpenState('error');
                        setTimeout(() => setOpenState('idle'), 3000);
                    },
                }
            );
        }, 1200);
    };

    const handleRevealClose = () => {
        setOpenState('idle');
        setRevealItem(null);
        onOpened();
    };

    // Box animation - direct animate props to avoid Variants type issues
    const boxAnimate = openState === 'shaking'
        ? {
            rotate: [0, -8, 8, -12, 12, -6, 6, 0] as number[],
            scale: [1, 1.05, 1.05, 1.08, 1.08, 1.05, 1.05, 1] as number[],
        }
        : { rotate: 0, scale: 1 };
    const boxTransition = openState === 'shaking'
        ? { duration: 1.0, ease: 'easeInOut' as const }
        : { duration: 0.3 };


    return (
        <>
            <div className="flex flex-col items-center gap-4">
                {/* Box visual */}
                <div className="relative">
                    {/* Glow ring during shake */}
                    {(openState === 'shaking' || openState === 'opening') && (
                        <motion.div
                            className="absolute -inset-4 rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)' }}
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                        />
                    )}
                    <AnimatePresence mode="wait">
                        {openState !== 'opening' ? (
                            <motion.div
                                key="box"
                                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl cursor-pointer select-none"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(34,211,238,0.2))',
                                    border: '1px solid rgba(168,85,247,0.4)',
                                    boxShadow: openState === 'shaking' ? '0 0 40px rgba(168,85,247,0.8)' : '0 0 15px rgba(168,85,247,0.3)',
                                }}
                                animate={boxAnimate}
                                transition={boxTransition}
                            >
                                🎁
                            </motion.div>
                        ) : (
                            <motion.div
                                key="burst"
                                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                                style={{ background: 'radial-gradient(circle, #fbbf24, #a855f7, transparent)' }}
                                initial={{ scale: 1, opacity: 1 }}
                                animate={{ scale: 3, opacity: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                ✨
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Open button */}
                {openState === 'idle' && (
                    <motion.button
                        id={`open-btn-${lootBoxObjectId.slice(-6)}`}
                        onClick={handleOpen}
                        className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all duration-200"
                        style={{
                            background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
                            boxShadow: '0 0 15px rgba(124,58,237,0.4)',
                        }}
                        whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(124,58,237,0.7)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Open
                    </motion.button>
                )}

                {openState === 'shaking' && (
                    <p className="text-xs text-purple-400 font-semibold animate-pulse">Shaking the box…</p>
                )}

                {openState === 'opening' && (
                    <p className="text-xs text-cyan-400 font-semibold animate-pulse">Minting your item…</p>
                )}

                {openState === 'error' && (
                    <p className="text-xs text-red-400 font-semibold">Failed to open. Try again.</p>
                )}
            </div>

            <RevealModal item={revealItem} onClose={handleRevealClose} />
        </>
    );
}
