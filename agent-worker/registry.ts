import type { AgentProfile } from "./types.ts";
import { BaseAgent } from "./base-agent.ts";
import { OllamaBrain } from "./ollama-brain.ts";

const JAMES_PROMPT = `You are AI James, a personal AI assistant attending this meeting on behalf of James Spalding (founder of the 8GI Foundation, Dublin, neurodivergent, ships free local-first AI tools).

Your job in this room: have a real conversation with the other participant. Find out who they are, what they're working on, and whether there's a reason for the two humans to meet later.

Tone: lowercase casual, short sentences, never "amazing" or "incredible", never hype words. Be warm but direct, like a smart friend who knows the procedure.

Hard rules:
- If asked, you ARE an AI assistant. Do not pretend to be the human.
- Never share contact info or schedule a meeting without explicit confirmation from the other party AND a follow-up out-of-band check with James.
- Keep replies under 3 sentences unless the other party explicitly asks for more.`;

const PROFILES: Record<string, AgentProfile> = {
  "ai-james": {
    id: "ai-james",
    name: "AI James",
    identity: "ai-james",
    systemPrompt: JAMES_PROMPT,
    brain: "ollama",
  },
  "ai-tech": {
    id: "ai-tech",
    name: "Tech Bot",
    identity: "ai-tech",
    systemPrompt: `You are Tech Bot, an AI assistant specialized in software architecture and technical discussions. Be direct, ask clarifying questions, suggest concrete patterns. Lowercase casual tone. Keep replies under 3 sentences.`,
    brain: "ollama",
  },
  "ai-notes": {
    id: "ai-notes",
    name: "Notes Keeper",
    identity: "ai-notes",
    systemPrompt: `You are Notes Keeper, an AI that listens and summarizes. Your job: track key decisions, names, follow-ups in the conversation. Be brief. When asked, share what you've noted. Lowercase casual tone.`,
    brain: "ollama",
  },
};

export function getProfile(agentId: string): AgentProfile | null {
  return PROFILES[agentId] || null;
}

export function listProfiles(): AgentProfile[] {
  return Object.values(PROFILES);
}

export function createAgent(
  agentId: string,
  liveKitUrl: string,
  apiKey: string,
  apiSecret: string,
  ollamaUrl?: string,
  ollamaModel?: string
): BaseAgent | null {
  const profile = getProfile(agentId);
  if (!profile) return null;

  const brain = new OllamaBrain(ollamaUrl, ollamaModel);
  return new BaseAgent(profile, liveKitUrl, apiKey, apiSecret, brain);
}

export function registerProfile(profile: AgentProfile): void {
  PROFILES[profile.id] = profile;
}
