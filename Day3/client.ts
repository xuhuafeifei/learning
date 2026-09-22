import { Context } from "./agent";
import { ToolSchema } from "./tools";

/**
 * 封装 LLM 调用 API，对外提供 promote 接口，获取 LLM 返回输出
 */
export class LLMClient {
  private apiKey: string;
  private tools: ToolSchema[];
  private controller: AbortController;

  constructor(apiKey: string, tools: ToolSchema[] = []) {
    this.apiKey = apiKey;
    this.tools = tools;
    this.controller = new AbortController();
  }

  abort() {
    this.controller.abort();
  }

  async prompt(context: Context[] = []): Promise<LLMMessage> {
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
          ...context,
        ],
        thinking: { type: "enabled" },
        reasoning_effort: "low",
        tools: this.tools,
      }),
      signal: this.controller.signal,
    });
    const data = await response.json();
    return new LLMMessage(data);
  }

  async *stream(context: Context[] = []): AsyncGenerator<LLMMessage> {
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
          ...context,
        ],
        thinking: { type: "enabled" },
        reasoning_effort: "low",
        stream: true,
        tools: this.tools,
      }),
      signal: this.controller.signal,
    });
    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of response.body ?? []) {
      // 防御, agent代码异常，导致服务端返回数据异常
      if (response.status !== 200) {
        throw new Error(
          `HTTP error: ${response.status}, ${response.statusText}, ${decoder.decode(chunk, { stream: true })}`,
        );
      }

      const text = decoder.decode(chunk, { stream: true });
      buffer += text;

      const lines = buffer.split("\n");
      // 取出第一条, 并清空之前的内容
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        // 防御
        if (line === null || line === "" || line === undefined) {
          continue;
        }
        if (line === "data: [DONE]") {
          return;
        }
        // 截取数据
        const data = line.substring(6);
        try {
          yield new LLMMessage(JSON.parse(data));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(`JSON.parse error: "${data}", ${errorMessage}`);
        }
      }
    }
    // buffer 数据清理
    if (buffer.trim()) {
    }
  }
}

export class LLMMessage {
  public id: string;
  public model: string;
  public choices: Choice[];

  constructor(data: any) {
    this.id = data.id;
    this.model = data.model;
    this.choices = data.choices.map((choice: any) => new Choice(choice));
  }
}

export class Choice {
  public index: number;
  public delta: Delta;
  public message: Message;
  public finish_reason: string;

  constructor(data: any) {
    this.index = data.index;
    this.delta = new Delta(data.delta);
    this.message = new Message(data.message);
    this.finish_reason = data.finish_reason;
  }
}

export class Delta {
  public content: string;
  public role: string;
  public reasoning_content: string;
  public tool_calls: ToolCall[];

  constructor(data: any) {
    this.content = data?.content ?? "";
    this.role = data?.role ?? "";
    this.reasoning_content = data?.reasoning_content ?? "";
    this.tool_calls =
      data?.tool_calls?.map((tool_call: any) => new ToolCall(tool_call)) ??
      ([] as ToolCall[]);
  }
}

export class Message {
  public content: string;
  public role: string;
  public reasoning_content: string;
  public tool_calls: ToolCall[];

  constructor(data: any) {
    this.content = data?.content ?? "";
    this.role = data?.role ?? "";
    this.reasoning_content = data?.reasoning_content ?? "";
    this.tool_calls =
      data?.tool_calls?.map((tool_call: any) => new ToolCall(tool_call)) ??
      ([] as ToolCall[]);
  }
}

export class ToolCall {
  public id: string;
  public index: number;
  public type: string;
  public function: {
    name: string;
    arguments: any;
  };

  constructor(data: any) {
    this.id = data?.id ?? "";
    this.index = data?.index ?? 0;
    this.type = data?.type ?? "";
    this.function =
      data?.function ??
      ({ name: "", arguments: {} } as {
        name: string;
        arguments: any;
      });
  }
}
