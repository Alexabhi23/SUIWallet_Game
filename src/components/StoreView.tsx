import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { BOX_TIERS, BoxTier, LOOT_BOX_MODULE, GAME_CONFIG_ID } from '../constants';

export default function StoreView() {
    const account = useCurrentAccount();
    const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
    const [selectedTierId, setSelectedTierId] = useState<string>(BOX_TIERS[0].id);
    const [buyingTierTx, setBuyingTierTx] = useState<string | null>(null);
    const [txResult, setTxResult] = useState<{ success: boolean; digest?: string } | null>(null);

    const pityCount = 24;
    const pityMax = 30;

    const selectedTier = BOX_TIERS.find(t => t.id === selectedTierId) || BOX_TIERS[0];

    const handleBuy = (tier: BoxTier) => {
        if (!account) return;
        setBuyingTierTx(tier.id);
        setTxResult(null);

        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(tier.priceInMist)]);
        tx.moveCall({
            target: `${LOOT_BOX_MODULE}::purchase_loot_box`,
            arguments: [
                tx.object(GAME_CONFIG_ID),
                coin,
            ],
        });

        signAndExecute(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { transaction: tx as any },
            {
                onSuccess: (result) => {
                    setTxResult({ success: true, digest: result.digest });
                    setBuyingTierTx(null);
                },
                onError: (err) => {
                    console.error('Purchase failed:', err);
                    setTxResult({ success: false });
                    setBuyingTierTx(null);
                },
            }
        );
    };

    return (
        <div>
            <div>
                <h3>Legendary Guarantee (Pity Tracker)</h3>
                <p>{pityCount} / {pityMax} Opens</p>
            </div>

            <hr />

            <div>
                <h4>Select Box Tier</h4>
                {BOX_TIERS.map(tier => (
                    <button
                        key={tier.id}
                        onClick={() => setSelectedTierId(tier.id)}
                        style={{ fontWeight: selectedTierId === tier.id ? 'bold' : 'normal', marginRight: '10px' }}
                    >
                        {tier.name}
                    </button>
                ))}
            </div>

            <div>
                <h2>{selectedTier.name}</h2>
                <p>Price: {selectedTier.price} SUI</p>

                <h4>Drop Rates:</h4>
                <ul>
                    <li>Common: {selectedTier.odds.common}%</li>
                    <li>Rare: {selectedTier.odds.rare}%</li>
                    <li>Epic: {selectedTier.odds.epic}%</li>
                    <li>Legendary: {selectedTier.odds.legendary}%</li>
                </ul>

                {txResult && (
                    <p>
                        {txResult.success ? `✅ Success! Tx: ${txResult.digest}` : '❌ Purchase failed or rejected.'}
                    </p>
                )}

                {!account && <p>⚠️ Connect your wallet to purchase.</p>}

                <button
                    disabled={!account || isPending || buyingTierTx === selectedTier.id}
                    onClick={() => handleBuy(selectedTier)}
                >
                    {buyingTierTx === selectedTier.id ? 'MINTING...' : 'BUY LOOT BOX'}
                </button>
            </div>
        </div>
    );
}
