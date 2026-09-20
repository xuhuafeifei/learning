/**
 * 封装 LLM 调用 API，对外提供 promote 接口，获取 LLM 返回输出
 */
export class LLMClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async prompt(inputMessage: string): Promise<LLMMessage> {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "you are a helpful assistant" },
          { role: "user", content: inputMessage },
        ],
        thinking: { type: "enabled" },
        reasoning_effort: "low",
      }),
    });
    const data = await response.json();
    return new LLMMessage(data);
  }

  async * stream(inputMessage: string): AsyncGenerator<LLMMessage> {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "you are a helpful assistant" },
          { role: "user", content: inputMessage },
        ],
        thinking: { type: "enabled" },
        reasoning_effort: "low",
        stream: true,
      }),
    });
    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of response.body ?? []) {
        const text = decoder.decode(chunk, { stream: true });
        buffer += text;

        const lines = buffer.split("\n")
        // 取出第一条, 并清空之前的内容
        buffer = lines.pop() ?? "";

        for (const line of lines) {
            if (!line.startsWith("data: ")) {
                continue;
            }
            if (line === "data: [DONE]") {
                return;
            }
            // 截取数据
            const data = line.substring(6);
            yield new LLMMessage(JSON.parse(data));
        }
    }
    return buffer;
  }
}

export class LLMMessage {
  private id: string;
  private model: string;
  private choices: Choice[];

  constructor(data: any) {
    this.id = data.id;
    this.model = data.model;
    this.choices = data.choices.map((choice: any) => new Choice(choice));
  }
}

export class Choice {
  private index: number;
  private delta: Delta;
  private message: Message;
  private finish_reason: string;

  constructor(data: any) {
    this.index = data.index;
    this.delta = new Delta(data.delta);
    this.message = new Message(data.message);
    this.finish_reason = data.finish_reason;
  }
}

export class Delta {
  private content: string;
  private role: string;
  private reasoning_content: string;

  constructor(data: any) {
    this.content = data?.content ?? "";
    this.role = data?.role ?? "";
    this.reasoning_content = data?.reasoning_content ?? "";
  }
}

export class Message {
  private content: string;
  private role: string;
  private reasoning_content: string;

  constructor(data: any) {
    this.content = data?.content ?? "";
    this.role = data?.role ?? "";
    this.reasoning_content = data?.reasoning_content ?? "";
  }
}
