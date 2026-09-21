import { LLMClient, ToolCall } from "./client";
import { ToolSchema } from "./tools";

interface AssistantContext {
  role: "assistant";
  content: string;
  tool_calls: ToolCall[];
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

  constructor(apiKey: string, tools: ToolSchema[]) {
    this.client = new LLMClient(apiKey, tools);
    this.tools = tools;
  }

  async run(inputMessage: string) {
    const context: Context[] = [];
    while (true) {
      const message = await this.client.prompt(inputMessage, context);
      // 输出当前消息
      console.log(JSON.stringify(message, null, 2));

      if (message?.choices?.[0]?.finish_reason !== "tool_calls") {
        break;
      }
      // 工具调用
      const toolCall = message.choices[0].message.tool_calls[0] as ToolCall;
      // 获取工具结果
      const toolResult = this.tools
        .find((tool) => tool.function.name === toolCall.function.name)
        ?.execute(toolCall.function.arguments);
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
    const context: Context[] = [];
    while (true) {
      for await (const message of this.client.stream(inputMessage, context)) {
        if (message?.choices?.[0]?.finish_reason !== "tool_calls") {
          break;
        }
        // 工具调用
        const toolCall = message.choices[0].message.tool_calls[0];
        // 获取工具结果
        const toolResult = this.tools
          .find((tool) => tool.function.name === toolCall.function.name)
          ?.execute(toolCall.function.arguments);
        context.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }
  }
}
