export interface AgentProfile {
  id: string;
  name: string;
  identity: string;
  systemPrompt: string;
  brain?: "ollama" | "custom";
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  message: string;
}

export interface EncodedChat {
  id: string;
  timestamp: number;
  message: string;
}
