import { ToolCall } from "./client";
import fs from "fs";

// context != memory
// context 是上下文，memory 是记忆
// ContextManager 是上下文管理器，用于管理上下文, 维护运行时的上下文信息，同时管理应当持久化哪些上下文
export class ContextManager {
  private contexts: Context[] = [];
  private filename: string = "./Day4/context.jsonl";

  constructor() {
    // 1. 先确保文件存在
    if (!fs.existsSync(this.filename)) {
      fs.writeFileSync(this.filename, "");
    }
    // 2. 再读取
    const content = fs.readFileSync(this.filename, "utf-8");
    // 按照行分割，然后解析为 JSON
    this.contexts = content.trim()
      ? content
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line))
      : [];
  }

  add(context: Context) {
    // 只持久化 assistant ,user, tool
    if (context.role !== "assistant" && context.role !== "user" && context.role !== "tool") {
      return;
    }
    this.contexts.push(context);
    // 追加到文件
    fs.appendFileSync(this.filename, JSON.stringify(context) + "\n");
  }

  get() {
    return [...this.contexts];
  }
}

interface AssistantContext {
  role: "assistant";
  reasoning_content: string;
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
