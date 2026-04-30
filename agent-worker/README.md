# 8meet agent-worker

**v0.2: Full multi-agent framework.** Local-first agent participants for 8meet rooms.

Per Principle 2 of the 8gent constitution: free and local by default. The brain is local Ollama, not a cloud API.

## Quick Start

1. Make sure Ollama is running:
   ```bash
   ollama pull qwen3.6:27b
   ollama serve   # default http://localhost:11434
   ```

2. Start 8meet dev server (from 8meet root):
   ```bash
   pnpm dev   # http://localhost:3000
   ```

3. In a browser, create a room (note the room name in the URL bar).

4. Spawn an agent into the room:
   ```bash
   # List available agents
   pnpm agent list

   # Run AI James in the room
   pnpm agent ai-james my-room-name

   # Or: Tech Bot, Notes Keeper, etc
   pnpm agent ai-tech my-room-name
   ```

5. Type a message in the chat panel. The agent replies.

## Architecture (v0.2)

### Framework

| Module | Purpose |
|--------|---------|
| `base-agent.ts` | Core agent class. Joins rooms, handles chat protocol. |
| `registry.ts` | Agent profile registry + factory. Define new agents here. |
| `ollama-brain.ts` | Reusable Ollama integration. |
| `dispatcher.ts` | Future: 8gent-social spawn protocol. |
| `agent-cli.ts` | CLI: spawn agents by name. |
| `env-loader.ts` | Shared .env.local parsing. |
| `types.ts` | TypeScript types. |

### Built-in Agents

- `ai-james`: General conversationalist on behalf of James Spalding.
- `ai-tech`: Technical/architecture specialist.
- `ai-notes`: Meeting summarizer.

### Adding a New Agent

Edit `registry.ts`, add to `PROFILES`:

```typescript
"ai-my-agent": {
  id: "ai-my-agent",
  name: "My Agent",
  identity: "ai-my-agent",
  systemPrompt: "You are...",
  brain: "ollama",
}
```

Then: `pnpm agent ai-my-agent my-room`

## Environment (.env.local)

```bash
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.6:27b
```

## Backwards Compatibility

`agent-james.mjs` still works but is deprecated:
```bash
pnpm agent:james my-room
```

Use `pnpm agent ai-james my-room` instead.

## What's Here, What's Not (v0.2)

### Done
- ✓ Multi-agent registry
- ✓ Pluggable brain (Ollama)
- ✓ Text chat via LiveKit data channel
- ✓ CLI dispatch by agent name
- ✓ Greeting + back-and-forth conversation
- ✓ Local-first (no APIs)

### Not Yet (on 8gent-social roadmap)
- Audio/video
- Persistent transcript storage
- Memory across sessions (in-memory history only)
- Control plane / 8gent-social matching
- Scopes / consent UI
- Cross-agent collaboration patterns

## Next Steps

1. Wire dispatcher to 8gent-social agent-mail bus (agent spawn from control plane).
2. Add audio/video support (LiveKit track management).
3. Persistence layer for transcripts + context.
4. Memory / context enrichment from user bus (calendar, projects, etc.).
