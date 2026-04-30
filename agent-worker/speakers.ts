/**
 * Text-to-speech providers.
 *
 * Pluggable interface for agent voice output.
 * Local-first (Principle 2): prefer local TTS, fallback to APIs.
 */

export interface Speaker {
  speak(text: string): Promise<AudioBuffer | Buffer>;
  close(): Promise<void>;
}

/**
 * Null speaker: silent by default.
 * Useful for testing, or when agents are text-only.
 */
export class NullSpeaker implements Speaker {
  async speak(_text: string): Promise<Buffer> {
    return Buffer.alloc(0);
  }

  async close(): Promise<void> {
    // no-op
  }
}

/**
 * Local TTS via Node.js say command (macOS only).
 * Falls back to NullSpeaker on non-macOS.
 *
 * Usage:
 *   const speaker = new LocalSaysSpeaker("Alex");  // Alex voice
 *   const audio = await speaker.speak("hello world");
 */
export class LocalSaysSpeaker implements Speaker {
  private voice: string;

  constructor(voice: string = "Alex") {
    this.voice = voice;
  }

  async speak(text: string): Promise<Buffer> {
    if (process.platform !== "darwin") {
      console.warn("[LocalSaysSpeaker] not on macOS, returning silent audio");
      return Buffer.alloc(0);
    }

    // Note: This is a placeholder. Real implementation would pipe
    // the say command output to WAV format and return it.
    // For now, log and return empty buffer.
    console.log(`[speaker] (${this.voice}): "${text}"`);
    return Buffer.alloc(0);
  }

  async close(): Promise<void> {
    // no-op
  }
}

/**
 * ElevenLabs API speaker.
 * Requires ELEVENLABS_API_KEY env var.
 *
 * Usage:
 *   const speaker = new ElevenLabsSpeaker("ai-james-voice-id");
 *   const audio = await speaker.speak("hello world");
 */
export class ElevenLabsSpeaker implements Speaker {
  private apiKey: string;
  private voiceId: string;
  private baseUrl: string = "https://api.elevenlabs.io/v1";

  constructor(voiceId: string, apiKey?: string) {
    this.voiceId = voiceId;
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || "";

    if (!this.apiKey) {
      throw new Error("ELEVENLABS_API_KEY not set");
    }
  }

  async speak(text: string): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`ElevenLabs HTTP ${res.status}: ${await res.text()}`);
    }

    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
  }

  async close(): Promise<void> {
    // no-op
  }
}

/**
 * Factory: create a speaker based on env or config.
 */
export function createSpeaker(type: "local" | "elevenlabs" | "null" = "local"): Speaker {
  if (type === "elevenlabs") {
    try {
      const voiceId = process.env.SPEAKER_VOICE_ID || "default";
      return new ElevenLabsSpeaker(voiceId);
    } catch {
      console.warn("ElevenLabs speaker failed, falling back to local");
      return new LocalSaysSpeaker();
    }
  }

  if (type === "local") {
    return new LocalSaysSpeaker();
  }

  return new NullSpeaker();
}
