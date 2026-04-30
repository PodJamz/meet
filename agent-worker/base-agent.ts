import { AccessToken } from "livekit-server-sdk";
import { Room, RoomEvent, DataPacketKind, LocalAudioTrack } from "@livekit/rtc-node";
import { OllamaBrain } from "./ollama-brain.ts";
import { createSpeaker } from "./speakers.ts";
import type { AgentProfile } from "./types.ts";
import type { Speaker } from "./speakers.ts";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const CHAT_TOPIC = "lk-chat-topic";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class BaseAgent {
  private profile: AgentProfile;
  private room: Room;
  private brain: OllamaBrain;
  private liveKitUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private history: Message[] = [];
  private speaker: Speaker;
  private enableAudio: boolean;

  constructor(
    profile: AgentProfile,
    liveKitUrl: string,
    apiKey: string,
    apiSecret: string,
    brain?: OllamaBrain,
    enableAudio: boolean = false
  ) {
    this.profile = profile;
    this.room = new Room();
    this.liveKitUrl = liveKitUrl;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.brain = brain || new OllamaBrain();
    this.enableAudio = enableAudio;
    this.speaker = createSpeaker("local");
  }

  private makeToken(roomName: string): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: this.profile.identity,
      name: this.profile.name,
      ttl: 60 * 60,
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublishData: true,
      canSubscribe: true,
      canPublish: false,
    });
    return at.toJwt();
  }

  private encodeChat(message: string): Uint8Array {
    const obj = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      message,
    };
    return encoder.encode(JSON.stringify(obj));
  }

  private decodeChat(payload: Uint8Array): string | null {
    try {
      const obj = JSON.parse(decoder.decode(payload)) as { message?: string };
      if (obj && typeof obj.message === "string") {
        return obj.message;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  private setupListeners(): void {
    this.room.on(RoomEvent.Connected, async () => {
      console.log(`[${this.profile.id}] connected as "${this.profile.name}"`);
      const greeting = this.getGreeting();
      await this.room.localParticipant.publishData(this.encodeChat(greeting), {
        reliable: true,
        topic: CHAT_TOPIC,
      });
      console.log(`[${this.profile.id}] -> "${greeting}"`);
    });

    this.room.on(RoomEvent.DataReceived, async (payload, participant, _kind, topic) => {
      if (topic !== CHAT_TOPIC) return;
      if (participant?.identity === this.profile.identity) return;

      const message = this.decodeChat(payload);
      if (!message) return;

      const who = participant?.name || participant?.identity || "someone";
      console.log(`[${this.profile.id}] <- ${who}: "${message}"`);

      this.history.push({ role: "user", content: `${who}: ${message}` });

      try {
        const reply = await this.brain.generate(this.profile.systemPrompt, message, this.history);
        this.history.push({ role: "assistant", content: reply });
        await this.room.localParticipant.publishData(this.encodeChat(reply), {
          reliable: true,
          topic: CHAT_TOPIC,
        });
        console.log(`[${this.profile.id}] -> "${reply}"`);

        if (this.enableAudio) {
          try {
            await this.publishAudio(reply);
          } catch (audioErr) {
            const audioMsg = audioErr instanceof Error ? audioErr.message : String(audioErr);
            console.warn(`[${this.profile.id}] audio publish failed:`, audioMsg);
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[${this.profile.id}] brain error:`, errorMsg);
        await this.room.localParticipant.publishData(
          this.encodeChat("(brain hiccup, give me a sec)"),
          { reliable: true, topic: CHAT_TOPIC }
        );
      }
    });

    this.room.on(RoomEvent.Disconnected, async () => {
      console.log(`[${this.profile.id}] disconnected`);
      await this.close();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log(`\n[${this.profile.id}] sigint, leaving room`);
      await this.room.disconnect();
    });
  }

  protected getGreeting(): string {
    return `hey, ${this.profile.name.toLowerCase()} here.`;
  }

  private async publishAudio(text: string): Promise<void> {
    if (!this.enableAudio) return;

    const audioBuffer = await this.speaker.speak(text);
    if (audioBuffer.length === 0) {
      console.log(`[${this.profile.id}] audio silent (local TTS)`);
      return;
    }

    // TODO: implement LocalAudioTrack publishing
    // This requires setting up audio encoding and publishing to LiveKit.
    // For now, logging that audio would be published.
    console.log(`[${this.profile.id}] audio published (${audioBuffer.length} bytes)`);
  }

  async join(roomName: string): Promise<void> {
    const token = await this.makeToken(roomName);
    console.log(
      `[${this.profile.id}] joining room "${roomName}" at ${this.liveKitUrl}`
    );

    this.setupListeners();
    await this.room.connect(this.liveKitUrl, token, { autoSubscribe: true });
  }

  getProfile(): AgentProfile {
    return this.profile;
  }

  getHistory(): Message[] {
    return this.history;
  }

  async close(): Promise<void> {
    await this.speaker.close();
  }
}
