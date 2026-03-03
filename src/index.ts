#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.BOTINDEX_BASE_URL || 'https://king-backend.fly.dev';
const API_PREFIX = '/api/botindex';

interface EndpointDef {
  name: string;
  description: string;
  path: string;
  params?: Record<string, { type: 'string' | 'number'; description: string; required?: boolean }>;
}

const ENDPOINTS: EndpointDef[] = [
  // Discovery
  {
    name: 'botindex_discover',
    description: 'List all available BotIndex API endpoints with pricing and descriptions',
    path: '/v1/',
  },

  // Sports
  {
    name: 'botindex_sports_odds',
    description: 'Get live sports betting odds across multiple bookmakers for upcoming games',
    path: '/v1/sports/odds',
    params: {
      sport: { type: 'string', description: 'Sport key (e.g. americanfootball_nfl, basketball_nba)', required: false },
    },
  },
  {
    name: 'botindex_sports_lines',
    description: 'Get betting lines (spreads, totals, moneylines) with line movement data',
    path: '/v1/sports/lines',
    params: {
      sport: { type: 'string', description: 'Sport key', required: false },
    },
  },
  {
    name: 'botindex_sports_props',
    description: 'Get player prop bets with odds from multiple books',
    path: '/v1/sports/props',
    params: {
      sport: { type: 'string', description: 'Sport key', required: false },
    },
  },
  {
    name: 'botindex_sports_correlations',
    description: 'Get correlated player/team prop combinations for parlay building',
    path: '/v1/sports/correlations',
    params: {
      sport: { type: 'string', description: 'Sport key', required: false },
    },
  },
  {
    name: 'botindex_sports_optimizer',
    description: 'Optimize DFS/betting lineups using projected values and correlations',
    path: '/v1/sports/optimizer',
    params: {
      sport: { type: 'string', description: 'Sport key', required: false },
    },
  },
  {
    name: 'botindex_sports_arb',
    description: 'Find arbitrage opportunities across bookmakers for guaranteed profit',
    path: '/v1/sports/arb',
    params: {
      sport: { type: 'string', description: 'Sport key', required: false },
    },
  },

  // Crypto
  {
    name: 'botindex_crypto_tokens',
    description: 'Get token universe with prices, market caps, and correlation data from DexScreener',
    path: '/v1/crypto/tokens',
  },
  {
    name: 'botindex_crypto_graduating',
    description: 'Get tokens graduating from launchpad sandboxes (Hyperliquid Catapult) to live markets',
    path: '/v1/crypto/graduating',
  },

  // Solana
  {
    name: 'botindex_solana_launches',
    description: 'Get Metaplex Genesis token launches on Solana mainnet',
    path: '/v1/solana/launches',
  },
  {
    name: 'botindex_solana_active',
    description: 'Get currently active Solana token launches being monitored',
    path: '/v1/solana/active',
  },

  // Commerce
  {
    name: 'botindex_commerce_compare',
    description: 'Compare agentic commerce protocols (ACP vs UCP vs x402) for a given query — merchant trust scores, fees, capabilities',
    path: '/v1/commerce/compare',
    params: {
      q: { type: 'string', description: 'Search query (e.g. "electronics", "SaaS subscriptions")', required: true },
    },
  },
  {
    name: 'botindex_commerce_protocols',
    description: 'Get protocol directory — ACP, UCP, x402 with fee structures and merchant counts',
    path: '/v1/commerce/protocols',
  },

  // Premium analytics
  {
    name: 'botindex_dashboard',
    description: 'Get BotIndex dashboard — correlation matrix, market leaders, fear/greed across all tracked tokens',
    path: '/x402/dashboard',
  },
  {
    name: 'botindex_correlation_leaders',
    description: 'Get top correlated and anti-correlated token pairs across multiple time windows',
    path: '/x402/correlation-leaders',
  },
  {
    name: 'botindex_signals',
    description: 'Get prediction market arbitrage signals and cross-market divergences',
    path: '/x402/signals',
  },
  {
    name: 'botindex_agent_trace',
    description: 'Get execution trace and history for a specific BotIndex agent',
    path: '/x402/trace/{agentId}',
    params: {
      agentId: { type: 'string', description: 'Agent ID (spreadhunter, rosterradar, arbwatch, memeradar, botindex)', required: true },
    },
  },
];

async function fetchEndpoint(path: string, params?: Record<string, string>): Promise<string> {
  const url = new URL(`${API_PREFIX}${path}`, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'BotIndex-MCP-Server/1.0',
    },
  });

  if (response.status === 402) {
    const body = await response.text();
    return JSON.stringify({
      status: 402,
      message: 'Payment Required — this endpoint requires x402 payment (USDC on Base). See x402.org for protocol details.',
      x402_info: {
        protocol: 'x402',
        network: 'base',
        currency: 'USDC',
        details: 'Include x402 payment header to access this endpoint. See https://x402.org for SDK integration.',
      },
      raw_response: body.slice(0, 500),
    }, null, 2);
  }

  if (!response.ok) {
    return JSON.stringify({
      status: response.status,
      error: `HTTP ${response.status}: ${response.statusText}`,
      body: (await response.text()).slice(0, 500),
    }, null, 2);
  }

  const data = await response.json();
  return JSON.stringify(data, null, 2);
}

async function main() {
  const server = new McpServer({
    name: 'BotIndex',
    version: '1.0.0',
  });

  // Register each endpoint as a tool
  for (const endpoint of ENDPOINTS) {
    const paramSchemaEntries: Record<string, z.ZodTypeAny> = {};

    if (endpoint.params) {
      for (const [key, def] of Object.entries(endpoint.params)) {
        const base = def.type === 'number' ? z.number() : z.string();
        paramSchemaEntries[key] = def.required ? base.describe(def.description) : base.optional().describe(def.description);
      }
    }

    const shape = Object.keys(paramSchemaEntries).length > 0 ? paramSchemaEntries : { _unused: z.string().optional().describe('No parameters needed') };

    server.tool(
      endpoint.name,
      endpoint.description,
      shape,
      async (args) => {
        let path = endpoint.path;
        const queryParams: Record<string, string> = {};

        if (endpoint.params && args) {
          for (const [key, value] of Object.entries(args)) {
            if (key === '_unused' || value === undefined || value === null) continue;
            if (path.includes(`{${key}}`)) {
              path = path.replace(`{${key}}`, String(value));
            } else {
              queryParams[key] = String(value);
            }
          }
        }

        try {
          const result = await fetchEndpoint(path, queryParams);
          return { content: [{ type: 'text' as const, text: result }] };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [{ type: 'text' as const, text: `Error calling BotIndex API: ${message}` }],
            isError: true,
          };
        }
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
