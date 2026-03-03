# BotIndex MCP Server

MCP server for [BotIndex](https://king-backend.fly.dev/api/botindex/v1/) — an x402-gated API providing sports betting, crypto, and commerce intelligence data for AI agents.

## Features

- **17 tools** covering sports odds, crypto tokens, Solana launches, commerce protocol comparison, and correlation analytics
- **x402 payment protocol** — pay-per-request with USDC on Base (no API keys, no subscriptions)
- Works with Claude Desktop, Cursor, Cline, Windsurf, Continue.dev, and any MCP-compatible client

## Installation

```bash
npx @cyberweasel777/botindex-mcp-server
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "botindex": {
      "command": "npx",
      "args": ["-y", "@cyberweasel777/botindex-mcp-server"]
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
      "args": ["-y", "@cyberweasel777/botindex-mcp-server"]
    }
  }
}
```

## Available Tools

### Sports
| Tool | Description |
|------|-------------|
| `botindex_sports_odds` | Live odds across multiple bookmakers |
| `botindex_sports_lines` | Betting lines with movement data |
| `botindex_sports_props` | Player prop bets |
| `botindex_sports_correlations` | Correlated prop combinations for parlays |
| `botindex_sports_optimizer` | DFS/betting lineup optimizer |
| `botindex_sports_arb` | Cross-bookmaker arbitrage opportunities |

### Crypto
| Tool | Description |
|------|-------------|
| `botindex_crypto_tokens` | Token universe with prices and correlations |
| `botindex_crypto_graduating` | Tokens graduating from launchpad to live markets |

### Solana
| Tool | Description |
|------|-------------|
| `botindex_solana_launches` | Metaplex Genesis token launches |
| `botindex_solana_active` | Active Solana token launches |

### Commerce
| Tool | Description |
|------|-------------|
| `botindex_commerce_compare` | Compare ACP vs UCP vs x402 protocols |
| `botindex_commerce_protocols` | Protocol directory with fees and merchant counts |

### Analytics
| Tool | Description |
|------|-------------|
| `botindex_dashboard` | Correlation matrix, market leaders, fear/greed |
| `botindex_correlation_leaders` | Top correlated/anti-correlated token pairs |
| `botindex_signals` | Prediction market arbitrage signals |
| `botindex_agent_trace` | Execution history for BotIndex agents |

### Discovery
| Tool | Description |
|------|-------------|
| `botindex_discover` | List all endpoints with pricing |

## Payment

BotIndex uses the [x402 protocol](https://x402.org) for payment. Endpoints return HTTP 402 with payment instructions. Integrate the x402 SDK to enable automatic USDC payments on Base.

## License

MIT
