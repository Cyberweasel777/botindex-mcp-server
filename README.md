# BotIndex MCP Server

> Signal intelligence for AI agents — sports odds, crypto correlations, token graduations, and more. **50 free premium requests per wallet.** Then pay per request with USDC via [x402](https://x402.org). No API keys. Every response carries a cryptographically signed [Agent Action Receipt (AAR)](https://aar.botindex.dev).

**Live API:** [king-backend.fly.dev](https://king-backend.fly.dev/api/botindex/v1/)

---

## Try It Now

```bash
# Run the MCP server
npx botindex-mcp-server

# Or test the API directly (free endpoints)
curl https://king-backend.fly.dev/api/botindex/v1/
curl https://king-backend.fly.dev/api/botindex/zora/trending-coins
curl https://king-backend.fly.dev/api/botindex/hyperliquid/funding-arb
```

---

## Install

```bash
npm install botindex-mcp-server
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "botindex": {
      "command": "npx",
      "args": ["-y", "botindex-mcp-server"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "botindex": {
      "command": "npx",
      "args": ["-y", "botindex-mcp-server"]
    }
  }
}
```

### Windsurf / Cline / Continue.dev

Same pattern — point your MCP config at `npx botindex-mcp-server`.

---

## 17 Tools

### Sports Intelligence
| Tool | Description | Price |
|------|-------------|-------|
| `botindex_sports_odds` | Live odds across NFL, NBA, UFC, NHL | $0.02 |
| `botindex_sports_lines` | Line movements + sharp action flags | $0.02 |
| `botindex_sports_props` | Player prop bets with confidence | $0.02 |
| `botindex_sports_correlations` | Player correlation matrix for DFS | $0.05 |
| `botindex_sports_optimizer` | Correlation-adjusted DFS lineup optimizer | $0.10 |
| `botindex_sports_arb` | Cross-platform arbitrage scanner | $0.05 |

### Crypto & Token Launches
| Tool | Description | Price |
|------|-------------|-------|
| `botindex_crypto_tokens` | Token universe with price data | $0.02 |
| `botindex_crypto_graduating` | Catapult→Hyperliquid graduation signals | $0.02 |
| `botindex_solana_launches` | Metaplex Genesis token launches | $0.02 |
| `botindex_solana_active` | Active Genesis launches only | $0.02 |
| `botindex_correlation_leaders` | Top correlated/anti-correlated pairs | $0.05 |

### Agentic Commerce
| Tool | Description | Price |
|------|-------------|-------|
| `botindex_commerce_compare` | Compare ACP vs UCP vs x402 protocols | $0.05 |
| `botindex_commerce_protocols` | Protocol directory with fees | $0.01 |

### Premium Analytics
| Tool | Description | Price |
|------|-------------|-------|
| `botindex_dashboard` | Correlation matrix, leaders, fear/greed | $0.50 |
| `botindex_signals` | Aggregated prediction market signals | $0.10 |
| `botindex_agent_trace` | Agent reasoning trace | $0.05 |
| `botindex_discover` | Full endpoint catalog (FREE) | Free |

---

## How Payment Works

BotIndex uses [x402](https://github.com/coinbase/x402) — the HTTP 402 Payment Required protocol by Coinbase.

```
Your Agent → calls botindex tool
MCP Server → GET king-backend.fly.dev/api/botindex/v1/sports/odds
           ← 402 + payment instructions (amount, wallet, network)
           → pays USDC on Base via x402
           ← 200 + data
```

No API keys. No signup. No rate limit tiers. Your wallet is your identity.

### Free Trial

Every wallet gets **50 free premium requests**. Just send an `X-Wallet: 0x...` header. The response includes `X-BotIndex-Free-Remaining` so you know exactly where you stand. After 50 requests, x402 payment kicks in automatically.

To enable automatic payments after trial, configure your agent with a funded Base wallet and the [@x402/client](https://www.npmjs.com/package/@x402/client) SDK.

---

## Free Endpoints (No Payment)

These work out of the box — no wallet needed:

- `botindex_discover` — full endpoint catalog with pricing
- Zora trending coins (via API: `/api/botindex/zora/trending-coins`)
- Hyperliquid funding arb (via API: `/api/botindex/hyperliquid/funding-arb`)

---

## Free vs Pro

- **Free key:** 100 requests/day on free endpoints. Premium endpoints return an upgrade/payment prompt.
- **Pro key ($29/mo):** Unlimited access to all endpoints with no x402 payment gates.

Upgrade link: https://api.botindex.dev/api/botindex/keys/register?plan=pro

---

## Verifiable Agent Actions (AAR)

Every BotIndex API response carries a signed **Agent Action Receipt** in the `X-AAR-Receipt` header — Ed25519-signed proof of what your agent requested, what was returned, and what it cost.

- **Verify any receipt independently** — no trusted intermediary needed
- **Privacy-preserving** — inputs/outputs are SHA-256 hashed, not exposed
- **Compatible with [Mastercard Verifiable Intent](https://www.mastercard.com/us/en/news-and-trends/stories/2026/verifiable-intent.html)** — bidirectional mapping
- **Aztec ZK-compatible** — verify on-chain without revealing contents

```bash
npm install botindex-aar
```

```ts
import { verifyReceipt } from 'botindex-aar';
const result = verifyReceipt(receipt);
// { ok: true } — receipt is valid and untampered
```

- **AAR Spec:** [github.com/Cyberweasel777/agent-action-receipt-spec](https://github.com/Cyberweasel777/agent-action-receipt-spec)
- **Landing:** [aar.botindex.dev](https://aar.botindex.dev)
- **npm:** [botindex-aar](https://www.npmjs.com/package/botindex-aar)

---

## Links

- **API:** [king-backend.fly.dev/api/botindex/v1/](https://king-backend.fly.dev/api/botindex/v1/)
- **Agent Discovery:** [/.well-known/ai-plugin.json](https://king-backend.fly.dev/.well-known/ai-plugin.json)
- **AAR Trust Layer:** [aar.botindex.dev](https://aar.botindex.dev)
- **x402 Protocol:** [github.com/coinbase/x402](https://github.com/coinbase/x402)
- **Source:** [github.com/Cyberweasel777/king-backend](https://github.com/Cyberweasel777/king-backend)

---

## License

MIT

## Hosted deployment

A hosted deployment is available on [Fronteir AI](https://fronteir.ai/mcp/cyberweasel777-botindex-mcp-server).

