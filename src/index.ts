#!/usr/bin/env node

/**
 * BotIndex MCP Server
 *
 * Exposes BotIndex signal intelligence API as MCP tools.
 * All paid endpoints require x402 payment (USDC on Base).
 * Discovery endpoint is free.
 *
 * Usage:
 *   npx @cyberweasel/botindex-mcp
 *
 * Environment:
 *   BOTINDEX_URL — API base URL (default: https://king-backend.fly.dev/api/botindex/v1)
 *   BOTINDEX_CATALOG_URL — Full URL for MCP catalog (default: derived from BOTINDEX_URL)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.BOTINDEX_URL || 'https://king-backend.fly.dev/api/botindex';
const CATALOG_URL = process.env.BOTINDEX_CATALOG_URL || `${BASE_URL}/mcp-catalog`;
const AGORION_URL = process.env.AGORION_URL || 'https://king-backend.fly.dev/api/agorion';

interface ToolDef {
  name: string;
  description: string;
  path: string;
  params?: Array<{
    name: string;
    type: 'string' | 'number';
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
}

async function fetchBotindex(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString());

  if (res.status === 402) {
    const body = await res.json().catch(() => ({}));
    return {
      x402_payment_required: true,
      message: 'This endpoint requires x402 payment (USDC on Base). Include x402 payment header.',
      requirements: body,
      endpoint: path,
      wallet: '0x7E6C8EAc1b1b8E628fa6169eEeDf3cF9638b3Cbd',
      network: 'base',
      sdk: 'npm install @x402/client',
    };
  }

  if (!res.ok) {
    return { error: true, status: res.status, message: await res.text() };
  }

  return res.json();
}

async function fetchCatalog(): Promise<ToolDef[]> {
  try {
    const res = await fetch(CATALOG_URL);
    if (res.ok) {
      const data = await res.json() as { tools: ToolDef[] };
      if (data.tools && Array.isArray(data.tools)) {
        return data.tools;
      }
    }
  } catch (e) {
    console.error('Failed to fetch MCP catalog, using fallback:', e);
  }
  // Return empty - server will start with just the discover tool
  return [];
}

function buildZodSchema(params: ToolDef['params']): Record<string, any> {
  if (!params || params.length === 0) return {};

  const schema: Record<string, any> = {};
  for (const p of params) {
    let field: any;
    if (p.type === 'number') {
      field = z.number().describe(p.description);
    } else if (p.enum) {
      field = z.enum(p.enum as [string, ...string[]]).describe(p.description);
    } else {
      field = z.string().describe(p.description);
    }
    if (!p.required) {
      field = field.optional();
    }
    schema[p.name] = field;
  }
  return schema;
}

const server = new McpServer({
  name: 'botindex',
  version: '2.0.0',
});

// Always register the discovery tool
server.tool(
  'botindex_discover',
  'Get the full BotIndex API catalog — all endpoints, pricing, descriptions. FREE.',
  {},
  async () => {
    const data = await fetchBotindex('/v1/');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// Agorion: Agent Discovery Network
server.tool(
  'agorion_discover',
  'Search the Agorion agent service discovery network. Find APIs by capability, price, and network. Returns endpoints from 6+ providers including Polymarket, DeFi Llama, CoinGecko, Hyperliquid, Pump.fun, and BotIndex.',
  {
    capability: z.string().optional().describe('Filter by capability (e.g. market-data, prediction-markets, defi, crypto-prices, whale-tracking, funding-rates, meme-coins)'),
    maxPrice: z.number().optional().describe('Max price per call in USD (e.g. 0.05). Use 0 for free-only.'),
    network: z.string().optional().describe('Blockchain network filter (e.g. base)'),
    limit: z.number().optional().describe('Max results (default 25, max 200)'),
  },
  async (args: Record<string, any>) => {
    const url = new URL(`${AGORION_URL}/discover`);
    if (args.capability) url.searchParams.set('capability', args.capability);
    if (args.maxPrice !== undefined) url.searchParams.set('maxPrice', String(args.maxPrice));
    if (args.network) url.searchParams.set('network', args.network);
    if (args.limit) url.searchParams.set('limit', String(args.limit));
    const res = await fetch(url.toString());
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'agorion_providers',
  'List all providers registered in the Agorion discovery network with their service counts.',
  {},
  async () => {
    const res = await fetch(`${AGORION_URL}/providers`);
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'agorion_stats',
  'Get aggregate stats for the Agorion discovery network: total providers, services, capabilities breakdown.',
  {},
  async () => {
    const res = await fetch(`${AGORION_URL}/stats`);
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

async function main() {
  // Fetch tool catalog from king-backend
  const tools = await fetchCatalog();

  // Dynamically register all tools
  for (const tool of tools) {
    const zodSchema = buildZodSchema(tool.params);
    server.tool(
      tool.name,
      tool.description,
      zodSchema,
      async (args: Record<string, any>) => {
        const params: Record<string, string> = {};
        if (tool.params) {
          for (const p of tool.params) {
            if (args[p.name] !== undefined) {
              params[p.name] = String(args[p.name]);
            }
          }
        }
        const data = await fetchBotindex(tool.path, params);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('BotIndex MCP server error:', err);
  process.exit(1);
});
