interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OllamaBrain {
  private url: string;
  private model: string;

  constructor(url: string = "http://localhost:11434", model: string = "qwen3.6:27b") {
    this.url = url;
    this.model = model;
  }

  async generate(systemPrompt: string, userMessage: string, history: Message[]): Promise<string> {
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: userMessage },
    ];

    const res = await fetch(`${this.url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json() as { message?: { content?: string } };
    return (data.message?.content || "").trim();
  }
}
