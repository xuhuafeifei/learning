import { LLMClient, ToolCall } from "./client";
import { ContextManager } from "./context";
import { ToolSchema } from "./tools";

export class Agent {
  private tools: ToolSchema[];
  private maxLoop: number = 20;
  private apiKey: string;
  private client: LLMClient | null = null;

  constructor(apiKey: string, tools: ToolSchema[]) {
    this.tools = tools;
    this.apiKey = apiKey;
  }

  abort() {
    if (this.client) {
      console.log("abort!!!!");
      this.client.abort();
      console.log("abort success!!!!");
    }
  }

  private async doRun(contextManager: ContextManager, client: LLMClient) {
    for (let loop = 0; loop < this.maxLoop; loop++) {
      const message = await client.prompt(contextManager.get());

      if (message?.choices?.[0]?.finish_reason !== "tool_calls") {
        break;
      }
      // 工具调用
      const toolCall = message.choices[0].message.tool_calls[0] as ToolCall;
      // 获取工具结果
      const toolResult = await this.doExecute(toolCall);
      // 1. 先把 assistant 的 tool_calls 消息推进去
      contextManager.add({
        role: "assistant",
        content: message.choices[0].message.content ?? "",
        reasoning_content: message.choices[0].message.reasoning_content ?? "",
        tool_calls: message.choices[0].message.tool_calls,
      });
      // 累加到上下文
      contextManager.add({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult) ?? "",
      });
    }
  }

  async tryWithException(fn: () => Promise<any>) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("run aborted by user");
      } else {
        console.error("run error: ", error);
      }
    } finally {
      if (this.client) {
        this.client.abort();
        this.client = null;
      }
    }
  }

  async run(inputMessage: string) {
    const contextManager = new ContextManager();
    contextManager.add({ role: "user", content: inputMessage });
    return await this.tryWithException(() => {
      this.client = new LLMClient(this.apiKey, this.tools);
      return this.doRun(contextManager, this.client!);
    });
  }

  private async doStreamRun(contextManager: ContextManager, client: LLMClient) {
    for (let loop = 0; loop < this.maxLoop; loop++) {
      let reasoning_buffer = "";
      let content_buffer = "";
      let tool_call: ToolCall | null = null;
      let arguments_buffer = "";
      let last = "";

      console.log("contextManager.get(): ", contextManager.get());

      for await (const message of client.stream(contextManager.get())) {
        const finish_reason = message.choices[0].finish_reason;
        const delta = message.choices[0].delta;
        // delta累加
        if (delta.reasoning_content) {
          reasoning_buffer += delta.reasoning_content;
          if (last !== "reasoning_content") {
            process.stdout.write("\n");
          }
          process.stdout.write(delta.reasoning_content);
          last = "reasoning_content";
        }
        if (delta.content) {
          content_buffer += delta.content;
          if (last !== "content") {
            process.stdout.write("\n");
          }
          process.stdout.write(delta.content);
          last = "content";
        }
        if (delta.tool_calls && delta.tool_calls.length > 0) {
          if (delta.tool_calls[0].id) {
            // 第一轮 sse，存储完整 toolcall
            tool_call = delta.tool_calls[0];
          }
          // 累加 arguments
          arguments_buffer += delta.tool_calls[0].function.arguments;
          if (last !== "tool_calls") {
            process.stdout.write("\n");
          }
          process.stdout.write(delta.tool_calls[0].function.arguments);
          last = "tool_calls";
        }
        // 如果为 null，表示还是sse
        if (finish_reason) {
          if (finish_reason === "tool_calls" && tool_call) {
            tool_call.function.arguments = arguments_buffer;
            const toolResult = await this.doExecute(tool_call);
            contextManager.add({
              role: "assistant",
              reasoning_content: reasoning_buffer,
              content: content_buffer,
              tool_calls: [tool_call],
            });
            contextManager.add({
              role: "tool",
              tool_call_id: tool_call.id,
              // 需要stringify，不然会报错，导致API Server反序列化失败
              content: JSON.stringify(toolResult) ?? "",
            });
          } else if (finish_reason === "stop") {
            contextManager.add({
              role: "assistant",
              reasoning_content: reasoning_buffer,
              content: content_buffer,
            });
            return;
          }
        }
      }
    }
  }

  async streamRun(inputMessage: string) {
    const contextManager = new ContextManager();
    contextManager.add({ role: "user", content: inputMessage });
    return await this.tryWithException(() => {
      this.client = new LLMClient(this.apiKey, this.tools);
      return this.doStreamRun(contextManager, this.client!);
    });
  }

  // 工具执行异常处理
  async doExecute(toolCall: ToolCall) {
    const tool = this.tools.find(
      (tool) => tool.function.name === toolCall.function.name,
    );
    if (!tool) {
      return `Tool ${toolCall.function.name} not found`;
    }
    try {
      // 工具解析成 obj
      return await tool.execute(JSON.parse(toolCall.function.arguments));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Tool ${toolCall.function.name} execute error: ${errorMessage}`,
      );
      return `Tool ${toolCall.function.name} execute error: ${errorMessage}`;
    }
  }
}
