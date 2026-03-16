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

interface X402PaymentBody {
  x402Version?: number;
  accepts?: {
    scheme?: string;
    price?: string;
    network?: string;
    payTo?: string;
  };
  description?: string;
}

type FetchBotindexResult =
  | { kind: 'ok'; data: unknown }
  | { kind: 'premium'; message: string; requirements: X402PaymentBody }
  | { kind: 'error'; status: number; message: string };

function formatPremiumMessage(requirements: X402PaymentBody): string {
  const price = requirements.accepts?.price || '$0.01';

  return `🔒 PREMIUM ENDPOINT — ${price} USDC per call

How to unlock:
• Solo dev? Get a Pro key ($29/mo, unlimited): https://api.botindex.dev/api/botindex/keys/register?plan=pro
• Building an app? Same API, production-grade rate limits and uptime guarantees.
• Pay per call with crypto (x402) — automatic for x402-enabled agents.

💡 Free tier: Get an API key instantly (no credit card): https://api.botindex.dev/api/botindex/keys/register`;
}

function extractVerdict(data: any): string | null {
  if (!data?.verdict) return null;
  const v = data.verdict;
  return `⚡ VERDICT: ${v.action} (${v.confidence}% confidence) — ${v.one_liner}`;
}

function extractSummary(data: any): string | null {
  if (typeof data?.summary === 'string') return data.summary;
  if (typeof data?.summaryText === 'string') return data.summaryText;
  if (typeof data?.summary?.oneLiner === 'string') return data.summary.oneLiner;
  return null;
}

function extractMissed(data: any): string | null {
  if (!data?.missed) return null;
  const m = data.missed;
  return `⚠️ ${m.description}. Upgrade to see all: https://api.botindex.dev/api/botindex/keys/register?plan=basic`;
}

function extractIntelTeaser(data: any): string | null {
  return data?._cta?.intelligence_teaser || null;
}

function buildUpgradeFooter(data: any): string {
  const parts: string[] = [];

  const teaser = extractIntelTeaser(data);
  if (teaser) parts.push(`\n💡 ${teaser}`);

  const missed = extractMissed(data);
  if (missed) parts.push(`\n${missed}`);

  if (data?._cta?.telegram) {
    const tg = data._cta.telegram;
    const links: string[] = [];
    if (tg.whale_alerts) links.push(`🐋 Whale alerts: ${tg.whale_alerts.split(' — ')[0]}`);
    if (tg.zora_alpha) links.push(`🔥 Zora alpha: ${tg.zora_alpha.split(' — ')[0]}`);
    if (links.length) parts.push(`\n📱 Free Telegram alerts (no signup):\n${links.join('\n')}`);
  }

  if (!parts.length && !data?.isTruncated) return '';

  if (data?._cta?.upgrade) {
    parts.push(`\n🚀 Building an app with this data? Production API access: https://api.botindex.dev/api/botindex/keys/register?plan=basic`);
  }

  return parts.join('\n');
}

function toToolText(result: FetchBotindexResult): string {
  if (result.kind === 'premium') return result.message;
  if (result.kind === 'error') return `BotIndex API request failed (${result.status}): ${result.message}`;

  const data = result.data as any;

  // Build a human-readable header from structured fields
  const header: string[] = [];

  const summary = extractSummary(data);
  if (summary) header.push(`📊 ${summary}`);

  const verdict = extractVerdict(data);
  if (verdict) header.push(verdict);

  // Strip internal CTA fields from the data dump
  const cleanData = { ...data };
  delete cleanData._cta;
  delete cleanData._polyhacks;
  delete cleanData.missed;
  delete cleanData.upgrade;

  const jsonBody = JSON.stringify(cleanData, null, 2);
  const footer = buildUpgradeFooter(data);

  if (header.length) {
    return `${header.join('\n')}\n\n${jsonBody}${footer}`;
  }

  return `${jsonBody}${footer}`;
}

async function fetchBotindex(path: string, params?: Record<string, string>): Promise<FetchBotindexResult> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString());

  if (res.status === 402) {
    const bodyText = await res.text();
    let requirements: X402PaymentBody = {};

    if (bodyText) {
      try {
        requirements = JSON.parse(bodyText) as X402PaymentBody;
      } catch {
        requirements = {};
      }
    }

    return {
      kind: 'premium',
      message: formatPremiumMessage(requirements),
      requirements,
    };
  }

  if (!res.ok) {
    return { kind: 'error', status: res.status, message: await res.text() };
  }

  return { kind: 'ok', data: await res.json() };
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
  version: '2.1.1',
});

// Always register the discovery tool
server.tool(
  'botindex_discover',
  'Get the full BotIndex API catalog — all endpoints, pricing, descriptions. FREE. Includes whale alerts, funding arb, Zora trending, compliance headlines, trade signals, portfolio risk, and more.',
  {},
  async () => {
    const data = await fetchBotindex('/v1/');
    return { content: [{ type: 'text', text: toToolText(data) }] };
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
        return { content: [{ type: 'text', text: toToolText(data) }] };
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
