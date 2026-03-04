# SUI Wallet Game — Loot Box dApp

A Web3 Gaming Loot Box SPA built on the **Sui blockchain**. Buy loot boxes, watch an animated opening reveal, and collect GameItem NFTs directly to your wallet.

## ✨ Features

- 🔗 **Wallet Integration** — Connect any Sui-compatible wallet via `@mysten/dapp-kit`
- 🛒 **Loot Box Store** — Three tiers (Standard / Premium / Legendary) with live drop-rate odds
- 🎁 **Animated Reveal** — Shaking box animation → on-chain randomness → NFT reveal modal with particle burst
- ⚔️ **NFT Inventory** — Flip-card gallery of all `GameItem` objects with rarity filter tabs
- 🎨 **Dark Glassmorphism UI** — Neon purple/cyan/gold theme built with Tailwind CSS + Framer Motion

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Web3 | `@mysten/dapp-kit`, `@mysten/sui` |
| Data Fetching | `@tanstack/react-query` |
| Blockchain | Sui (Testnet / Mainnet) |

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## ⚙️ Configuration

Update `src/constants.ts` with your deployed Move package addresses:

```typescript
export const PACKAGE_ID    = '0x<your_package_id>';
export const GAME_CONFIG_ID = '0x<your_game_config_object_id>';
```

The Sui system Random object (`0x8`) is already wired up — no changes needed there.

## 📦 Move Contract Entrypoints

| Function | Description |
|---|---|
| `loot_box::purchase_loot_box` | Buy a loot box with SUI coins |
| `loot_box::open_loot_box` | Open a box using on-chain randomness (`0x8`) to mint a `GameItem` |

## 📄 License

MIT © 2026 Abhinav Sharma
