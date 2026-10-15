import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Agent } from "../Day7/agent";
import { VectorResult, VectorStore } from "../Day10/vectorStore";
import { Embedding } from "../Day8/embedding";
import { Chunker, FiftyCharacterChunkingStrategy } from "../Day9/chunk";
import { ToolSchema } from "../Day7/tools";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const vectorStore = new VectorStore(
  await Embedding.init(),
  new Chunker(),
  new FiftyCharacterChunkingStrategy(),
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const txtFilePath = path.join(__dirname, "../text/txt.md");
const txtContent = fs.readFileSync(txtFilePath, "utf-8");

async function main() {
  // 读取文件，写入 vectorStore
  // await vectorStore.add(txtContent, "default");

  while (true) {
    const rl = await readline.createInterface({ input, output });
    const inputMessage = await rl.question("请输入你的问题: ");
    if (inputMessage.trim().toLowerCase() === "exit") {
      console.log("退出程序");
      rl.close();
      break;
    }
    console.log("你输入的问题是: ", inputMessage);

    const agent = new Agent(process.env.DEEPSEEK_API_KEY ?? "", [
      searchToolSchema,
      persistToolSchema,
    ]);
    const result = await agent.streamRun(inputMessage);
    console.log("结果是: ", result);
    rl.close();
  }
}

main().catch(console.error);

// 创建 schema，用于调用 vectore store 工具
const searchToolSchema: ToolSchema = {
  type: "function",
  function: {
    name: "search",
    description: "搜索向量存储中的内容",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索的内容",
        },
      },
      required: ["query"],
    },
  },
  execute: searchTool,
};

async function searchTool(args: {
  query: string;
}): Promise<Omit<VectorResult, "vector">[]> {
  const result = await vectorStore.query(args.query, "default", 10);
  // 屏蔽 result 的 vector 字段
  return result.map(({ vector: _, ...rest }) => rest);
}

// 创建持久化 schema，用于调用向量存储中的内容
const persistToolSchema: ToolSchema = {
  type: "function",
  function: {
    name: "persist",
    description: "持久化向量存储中的内容",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "持久化的内容",
        },
      },
      required: ["content"],
    },
  },
  execute: persistTool,
};

async function persistTool(args: { content: string }) {
  await vectorStore.add(args.content, "default");
}
