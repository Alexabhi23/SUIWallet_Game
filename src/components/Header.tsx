import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export default function Header() {
    const account = useCurrentAccount();

    return (
        <header>
            <div>
                <h1>SUI Loot Box</h1>
                <p>{account ? 'Connected' : 'Disconnected'}</p>
            </div>
            <div>
                <ConnectButton />
            </div>
        </header>
    );
}
