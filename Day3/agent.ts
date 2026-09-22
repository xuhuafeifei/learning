import { LLMClient, LLMMessage, ToolCall } from "./client";
import { ToolSchema } from "./tools";

interface AssistantContext {
  role: "assistant";
  content: string;
  tool_calls?: ToolCall[];
}

interface UserContext {
  role: "user";
  content: string;
}

interface ToolContext {
  role: "tool";
  tool_call_id: string;
  content: string;
}

export type Context = UserContext | ToolContext | AssistantContext;

export class Agent {
  private client: LLMClient;
  private tools: ToolSchema[];
  private maxLoop: number = 20;

  constructor(apiKey: string, tools: ToolSchema[]) {
    this.client = new LLMClient(apiKey, tools);
    this.tools = tools;
  }

  async run(inputMessage: string) {
    const context: Context[] = [{ role: "user", content: inputMessage }];
    for (let loop = 0; loop < this.maxLoop; loop++) {
      const message = await this.client.prompt(context);
      // 输出当前消息
      console.log(JSON.stringify(message, null, 2));

      if (message?.choices?.[0]?.finish_reason !== "tool_calls") {
        break;
      }
      // 工具调用
      const toolCall = message.choices[0].message.tool_calls[0] as ToolCall;
      // 获取工具结果
      const toolResult = await this.doExecute(toolCall);
      // 1. 先把 assistant 的 tool_calls 消息推进去
      context.push({
        role: "assistant",
        content: message.choices[0].message.content ?? "",
        tool_calls: message.choices[0].message.tool_calls,
      });
      // 累加到上下文
      context.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult ?? "",
      });
    }
  }

  async streamRun(inputMessage: string) {
    const context: Context[] = [{ role: "user", content: inputMessage }];
    for (let loop = 0; loop < this.maxLoop; loop++) {
      const messages = await this.client.stream(context);
      let reasoning_buffer = "";
      let content_buffer = "";
      let tool_call: ToolCall | null = null;
      let arguments_buffer = "";

      for await (const message of messages) {
        const finish_reason = message.choices[0].finish_reason;
        const delta = message.choices[0].delta;
        // delta累加
        if (delta.reasoning_content) {
          reasoning_buffer += delta.reasoning_content;
          console.log("reasoning_buffer: ", delta.reasoning_content);
        }
        if (delta.content) {
          content_buffer += delta.content;
          console.log("content_buffer: ", delta.content);
        }
        if (delta.tool_calls && delta.tool_calls.length > 0) {
          if (delta.tool_calls[0].id) {
            // 第一轮 sse，存储完整 toolcall
            tool_call = delta.tool_calls[0];
          }
          // 累加 arguments
          arguments_buffer += delta.tool_calls[0].function.arguments;
          console.log(
            "arguments_buffer: ",
            delta.tool_calls[0].function.arguments,
          );
        }
        // 如果为 null，表示还是sse
        if (finish_reason) {
          if (finish_reason === "tool_calls" && tool_call) {
            tool_call.function.arguments = arguments_buffer;
            const toolResult = await this.doExecute(tool_call);
            context.push({
              role: "assistant",
              content: content_buffer,
              tool_calls: [tool_call],
            });
            context.push({
              role: "tool",
              tool_call_id: tool_call.id,
              content: toolResult ?? "",
            });
          } else if (finish_reason === "stop") {
            return;
          }
        }
      }
    }
  }

  // 工具执行异常处理
  async doExecute(toolCall: ToolCall) {
    const tool = this.tools.find((tool) => tool.function.name === toolCall.function.name);
    if (!tool) {
      return `Tool ${toolCall.function.name} not found`;
    }
    try {
      return await tool.execute(JSON.parse(toolCall.function.arguments));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Tool ${toolCall.function.name} execute error: ${errorMessage}`);
      return `Tool ${toolCall.function.name} execute error: ${errorMessage}`;
    }
  }
}
