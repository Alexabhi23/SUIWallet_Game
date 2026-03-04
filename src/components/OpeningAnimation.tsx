import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import {
    LOOT_BOX_MODULE, GAME_CONFIG_ID, RANDOM_OBJECT_ID,
    Rarity
} from '../constants';

interface Props {
    lootBoxObjectId: string;
    onOpened: () => void;
}

type OpenState = 'idle' | 'opening' | 'revealed' | 'error';

interface RevealItem {
    rarity: Rarity;
    powerLevel: number;
    name: string;
    objectId: string;
}

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
        name: `${rarity} Item`,
        objectId: typeof data.item_id === 'string' ? data.item_id : fallbackObjectId,
    };
}

export default function OpeningAnimation({ lootBoxObjectId, onOpened }: Props) {
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const [openState, setOpenState] = useState<OpenState>('idle');
    const [revealItem, setRevealItem] = useState<RevealItem | null>(null);

    const handleOpen = () => {
        setOpenState('opening');

        const tx = new Transaction();
        tx.moveCall({
            target: `${LOOT_BOX_MODULE}::open_loot_box`,
            arguments: [
                tx.object(GAME_CONFIG_ID),
                tx.object(lootBoxObjectId),
                tx.object(RANDOM_OBJECT_ID),
            ],
        });

        signAndExecute(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { transaction: tx as any },
            {
                onSuccess: async (result) => {
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
    };

    const handleRevealClose = () => {
        setOpenState('idle');
        setRevealItem(null);
        onOpened();
    };

    return (
        <div>
            {openState === 'idle' && (
                <button onClick={handleOpen}>Open Box</button>
            )}

            {openState === 'opening' && <p>Opening sequence started...</p>}
            {openState === 'error' && <p>Error opening box.</p>}

            {openState === 'revealed' && revealItem && (
                <div style={{ border: '2px solid green', padding: '10px', marginTop: '10px' }}>
                    <h3>Item Revealed!</h3>
                    <p>Name: {revealItem.name}</p>
                    <p>Rarity: {revealItem.rarity}</p>
                    <p>Power Level: {revealItem.powerLevel}</p>
                    <p>ID: {revealItem.objectId}</p>
                    <button onClick={handleRevealClose}>Acknowledge & Close</button>
                </div>
            )}
        </div>
    );
}
