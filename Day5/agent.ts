import { z } from "zod";
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

  private async doRun(
    contextManager: ContextManager,
    client: LLMClient,
  ): Promise<string> {
    for (let loop = 0; loop < this.maxLoop; loop++) {
      const message = await client.prompt(contextManager.get());
      const choice = message?.choices?.[0];
      if (!choice) {
        throw new Error("empty LLM response");
      }

      if (choice.finish_reason !== "tool_calls") {
        // 持久化
        contextManager.add({
          role: "assistant",
          content: choice.message.content ?? "",
          reasoning_content: choice.message.reasoning_content ?? "",
        });
        return choice.message.content ?? "";
      }
      // 工具调用
      const toolCall = choice.message.tool_calls[0] as ToolCall;
      // 获取工具结果
      const toolResult = await this.doExecute(toolCall);
      // 1. 先把 assistant 的 tool_calls 消息推进去
      contextManager.add({
        role: "assistant",
        content: choice.message.content ?? "",
        reasoning_content: choice.message.reasoning_content ?? "",
        tool_calls: choice.message.tool_calls,
      });
      // 累加到上下文
      contextManager.add({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult) ?? "",
      });
    }
    throw new Error("max loop exceeded");
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

      // console.log("contextManager.get(): ", contextManager.get());

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

  async structuredRun<T extends z.ZodType>(
    inputMessage: string,
    schema: T,
  ): Promise<z.infer<T>> {
    const contextManager = new ContextManager();
    const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
    contextManager.add({
      role: "user",
      content:
        `${inputMessage}\n\n` +
        `Please return the result as a single JSON object matching this schema:\n${jsonSchema}`,
    });
    return await this.tryWithException(async () => {
      this.client = new LLMClient(this.apiKey, this.tools);
      const content = await this.doRun(contextManager, this.client!);
      let jsonText = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      // 如果解析错误，需要累加到上下文，并要求 LLM 重新执行
      for (let i = 0; i < 3; i++) {
        try {
          return schema.parse(JSON.parse(jsonText));
        } catch (error) {
          console.log(
            `解析错误: ${i + 1}次, error: ${error}, jsonText: ${jsonText}`,
          );
          if (error instanceof Error) {
            contextManager.add({
              role: "user",
              content: `解析错误，请重新执行: ${error.message}\n\n${jsonText}`,
            });
          }
          // 重新执行
          const content = await this.doRun(contextManager, this.client!);
          jsonText = content
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();
        }
      }
      throw new Error("解析错误，重试3次失败");
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
