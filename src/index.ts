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
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.BOTINDEX_URL || 'https://king-backend.fly.dev/api/botindex/v1';

async function fetchBotindex(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString());

  if (res.status === 402) {
    const body = await res.json();
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

const server = new McpServer({
  name: 'botindex',
  version: '1.3.0',
});

// ── Free discovery ──────────────────────────────────────────────
server.tool(
  'botindex_discover',
  'Get the full BotIndex API catalog — all endpoints, pricing, descriptions. FREE.',
  {},
  async () => {
    const data = await fetchBotindex('/');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Sports tools ────────────────────────────────────────────────
server.tool(
  'botindex_sports_odds',
  'Live sports odds snapshot (NFL, NBA, UFC, NHL). Moneyline, spread, totals with bookmaker comparisons. $0.02',
  { sport: z.string().optional().describe('Filter by sport: nfl, nba, ufc, nhl') },
  async ({ sport }) => {
    const params: Record<string, string> = {};
    if (sport) params.sport = sport;
    const data = await fetchBotindex('/sports/odds', params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_sports_lines',
  'Line movements with sharp money action flags. Identifies professional bettor market impact. $0.02',
  {},
  async () => {
    const data = await fetchBotindex('/sports/lines');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_sports_props',
  'Top prop bet movements with confidence scores. Player prop market value signals. $0.02',
  {},
  async () => {
    const data = await fetchBotindex('/sports/props');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_sports_correlations',
  'Player correlation matrix for DFS and correlated betting. Shows co-performance patterns. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/sports/correlations');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_dfs_optimizer',
  'Correlation-adjusted DFS lineup optimizer. Returns optimized lineups accounting for player correlations. $0.10',
  {
    budget: z.number().optional().describe('Salary cap budget'),
    sport: z.string().optional().describe('Target sport'),
  },
  async ({ budget, sport }) => {
    const params: Record<string, string> = {};
    if (budget) params.budget = String(budget);
    if (sport) params.sport = sport;
    const data = await fetchBotindex('/sports/optimizer', params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_arb_scanner',
  'Cross-platform prediction market and sportsbook arbitrage scanner. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/sports/arb');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Crypto tools ────────────────────────────────────────────────
server.tool(
  'botindex_crypto_tokens',
  'Token universe with latest price data from MemeRadar correlation engine. $0.02',
  {},
  async () => {
    const data = await fetchBotindex('/crypto/tokens');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_crypto_graduating',
  'Token graduation signals from Catapult launchpad to Hyperliquid mainnet via GradSniper. $0.02',
  {},
  async () => {
    const data = await fetchBotindex('/crypto/graduating');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Solana tools ────────────────────────────────────────────────
server.tool(
  'botindex_solana_launches',
  'All tracked Metaplex Genesis token launches on Solana mainnet. $0.02',
  {},
  async () => {
    const data = await fetchBotindex('/solana/launches');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_solana_active',
  'Currently active Metaplex Genesis launches on Solana (filtered by status). $0.02',
  {},
  async () => {
    const data = await fetchBotindex('/solana/active');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Commerce tools ──────────────────────────────────────────────
server.tool(
  'botindex_commerce_compare',
  'Compare merchant offers across agentic commerce protocols (ACP, UCP, x402). Ranked offers with trust scores, fees, checkout protocol details. Use before any purchase. $0.05',
  {
    q: z.string().describe('Product search query (e.g. "GPU cloud credits", "market data feed")'),
    maxPrice: z.number().optional().describe('Maximum price filter'),
    protocol: z.enum(['acp', 'ucp', 'x402']).optional().describe('Preferred checkout protocol'),
    limit: z.number().optional().describe('Max results (default 10, max 50)'),
  },
  async ({ q, maxPrice, protocol, limit }) => {
    const params: Record<string, string> = { q };
    if (maxPrice) params.maxPrice = String(maxPrice);
    if (protocol) params.protocol = protocol;
    if (limit) params.limit = String(limit);
    const data = await fetchBotindex('/commerce/compare', params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_commerce_protocols',
  'Directory of agentic commerce protocols — ACP (OpenAI+Stripe), UCP (Google), x402 (Coinbase) with fee structures and merchant counts. $0.01',
  {},
  async () => {
    const data = await fetchBotindex('/commerce/protocols');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Premium tools ───────────────────────────────────────────────
server.tool(
  'botindex_signals',
  'Aggregated premium signals: correlation leaders + prediction arbitrage + market heatmap. $0.10',
  {},
  async () => {
    const data = await fetchBotindex('/signals');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_agent_trace',
  'Premium reasoning trace for a specific agent. $0.05',
  {
    agentId: z.enum(['spreadhunter', 'rosterradar', 'arbwatch', 'memeradar', 'botindex']).describe('Agent ID'),
  },
  async ({ agentId }) => {
    const data = await fetchBotindex(`/trace/${agentId}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_dashboard',
  'Full premium dashboard — all agents, traces, correlation matrices, prediction arb, heatmaps. Most comprehensive single-call data package. $0.50',
  {},
  async () => {
    const data = await fetchBotindex('/dashboard');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Zora tools ──────────────────────────────────────────────────
server.tool(
  'botindex_zora_trending_coins',
  'Get trending Zora attention market coins by volume velocity. Tracks which coins are gaining attention momentum on Zora. $0.03',
  { limit: z.number().optional().describe('Maximum results to return (default 20)') },
  async ({ limit }) => {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    const data = await fetchBotindex('/zora/trending-coins', params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_zora_creator_scores',
  'Get creator performance scores on Zora. Identifies top-performing creators by attention metrics and coin success rates. $0.03',
  { limit: z.number().optional().describe('Maximum results to return (default 20)') },
  async ({ limit }) => {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    const data = await fetchBotindex('/zora/creator-scores', params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_zora_attention_momentum',
  'Get attention momentum — which Zora trends are accelerating. Early signal for emerging attention markets before they peak. $0.03',
  { limit: z.number().optional().describe('Maximum results to return (default 20)') },
  async ({ limit }) => {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    const data = await fetchBotindex('/zora/attention-momentum', params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Hyperliquid tools ───────────────────────────────────────────
server.tool(
  'botindex_hl_funding_arb',
  'Get funding rate arbitrage opportunities between Hyperliquid and major CEXs. Identifies cross-exchange funding rate discrepancies for delta-neutral yield. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/hyperliquid/funding-arb');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_hl_correlation_matrix',
  'Get Hyperliquid perpetual correlation matrix. Shows price correlation between perp pairs for portfolio construction and risk management. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/hyperliquid/correlation-matrix');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_hl_liquidation_heatmap',
  'Get liquidation cluster heatmap by price level. Visualizes where liquidations cluster to predict support/resistance zones and volatility spikes. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/hyperliquid/liquidation-heatmap');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_hl_coin_analytics',
  'Get deep analytics for a specific Hyperliquid coin. Comprehensive metrics including OI, funding, volume, and liquidation history. $0.05',
  { address: z.string().describe('Coin address or symbol (e.g., "BTC", "ETH", or contract address)') },
  async ({ address }) => {
    const data = await fetchBotindex(`/hyperliquid/coin-analytics?address=${encodeURIComponent(address)}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Doppler tools ───────────────────────────────────────────────
server.tool(
  'botindex_doppler_launches',
  'Get recent Doppler token launches on Base. Shows new creator coins launching through the Doppler liquidity protocol. $0.01',
  { limit: z.number().optional().describe('Maximum results to return (default 10)') },
  async ({ limit }) => {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    const data = await fetchBotindex('/doppler/launches', params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Intel tools (DeepSeek AI premium analysis) ──────────────────
server.tool(
  'botindex_zora_intel',
  'AI-powered Zora market intelligence. DeepSeek analyzes trending coins, attention momentum, and creator data to produce: risk scores (0-100), fair value estimates, creator grades (A-F), BUY/WATCH/FADE signals with confidence scores, and market summary. Premium tier. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/zora/intel');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_hyperliquid_intel',
  'AI-powered Hyperliquid funding rate intelligence. DeepSeek analyzes funding rate patterns to predict rate persistence, optimal entry timing, risk-adjusted yield estimates, and convergence probability. Premium tier. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/hyperliquid/intel');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_crypto_intel',
  'AI-powered crypto correlation intelligence. DeepSeek performs regime detection on token correlations, identifies portfolio risk clusters, decorrelated alpha opportunities, and generates actionable trading signals. Premium tier. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/crypto/intel');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

server.tool(
  'botindex_doppler_intel',
  'AI-powered Doppler launch intelligence. DeepSeek evaluates new token launches for quality scores, rug probability, creator track record analysis, and BUY/WATCH/FADE signals. Premium tier. $0.05',
  {},
  async () => {
    const data = await fetchBotindex('/doppler/intel');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
);

// ── Start server ────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('BotIndex MCP server error:', err);
  process.exit(1);
});
