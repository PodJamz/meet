#!/usr/bin/env node

/**
 * agent-james - LiveKit room participant powered by local Ollama.
 *
 * DEPRECATED: Use agent-cli instead.
 *   node agent-worker/agent-cli.ts ai-james <ROOM_NAME>
 *
 * This file is kept for backwards compatibility.
 */

import { createAgent } from "./registry.ts";
import { loadEnv } from "./env-loader.ts";

const ROOM = process.argv[2];

if (!ROOM) {
  console.error("Usage: node agent-worker/agent-james.mjs ROOM_NAME");
  console.error("\n(Deprecated - use: agent-cli ai-james ROOM_NAME instead)");
  process.exit(2);
}

const env = loadEnv(".env.local");
const liveKitUrl = env.LIVEKIT_URL;
const apiKey = env.LIVEKIT_API_KEY;
const apiSecret = env.LIVEKIT_API_SECRET;

if (!liveKitUrl || !apiKey || !apiSecret) {
  console.error("Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET in .env.local");
  process.exit(1);
}

const ollamaUrl = env.OLLAMA_URL || "http://localhost:11434";
const ollamaModel = env.OLLAMA_MODEL || "qwen3.6:27b";

const agent = createAgent("ai-james", liveKitUrl, apiKey, apiSecret, ollamaUrl, ollamaModel);

if (!agent) {
  console.error("Failed to create agent");
  process.exit(1);
}

agent.join(ROOM).catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
