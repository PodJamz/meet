#!/usr/bin/env node

import { createAgent, listProfiles } from "./registry.ts";
import { requireEnv, loadEnv } from "./env-loader.ts";

const args = process.argv.slice(2);
const command = args[0];
const roomName = args[1];

if (!command || command === "--help" || command === "-h") {
  console.log(`
8meet agent worker CLI

Usage:
  agent-cli <agent-id> <room-name>
  agent-cli list
  agent-cli --help

Examples:
  agent-cli ai-james my-room
  agent-cli ai-tech my-room
  agent-cli list

Environment (.env.local):
  LIVEKIT_URL          (required)
  LIVEKIT_API_KEY      (required)
  LIVEKIT_API_SECRET   (required)
  OLLAMA_URL           (optional, default http://localhost:11434)
  OLLAMA_MODEL         (optional, default qwen3.6:27b)
`);
  process.exit(0);
}

if (command === "list") {
  const profiles = listProfiles();
  console.log("Available agents:");
  profiles.forEach((p) => {
    console.log(`  ${p.id}: ${p.name}`);
  });
  process.exit(0);
}

// Main: agent-cli <agent-id> <room-name>
if (!roomName) {
  console.error("Usage: agent-cli <agent-id> <room-name>");
  console.error("Run with --help for more info");
  process.exit(2);
}

const env = loadEnv(".env.local");
const required = requireEnv("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET");

const liveKitUrl = required.LIVEKIT_URL;
const apiKey = required.LIVEKIT_API_KEY;
const apiSecret = required.LIVEKIT_API_SECRET;
const ollamaUrl = env.OLLAMA_URL || "http://localhost:11434";
const ollamaModel = env.OLLAMA_MODEL || "qwen3.6:27b";

const agent = createAgent(command, liveKitUrl, apiKey, apiSecret, ollamaUrl, ollamaModel);

if (!agent) {
  console.error(`Unknown agent: ${command}`);
  console.error("Run with 'list' to see available agents");
  process.exit(1);
}

agent.join(roomName).catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("Fatal error:", msg);
  process.exit(1);
});
