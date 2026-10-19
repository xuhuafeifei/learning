// 遍历 data 目录，读取所有文件，写入 vectorStore
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { VectorStore } from "../Day10/vectorStore";
import { createVectorStoreTools } from "../Day10/vectorTools";
import { Chunker, FiftyCharacterChunkingStrategy } from "../Day9/chunk";
import { Embedding } from "../Day8/embedding";
import { Agent } from "../Day7/agent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");

const vectorStore = new VectorStore(
  await Embedding.init(),
  new Chunker(),
  new FiftyCharacterChunkingStrategy(),
);
const tools = createVectorStoreTools(vectorStore, "data");

async function main() {
  const files = fs.readdirSync(dataDir);
  for (const file of files) {
    const sourcePath = path.join(dataDir, file);
    const content = fs.readFileSync(sourcePath, "utf-8");
    await vectorStore.add(content, "data", sourcePath);
    console.log(`已写入: ${sourcePath}`);
  }
  console.log("存储完成");

  while (true) {
    const rl = readline.createInterface({ input, output });
    const inputMessage = await rl.question("请输入: ");
    if (inputMessage.trim().toLowerCase() === "exit") {
      console.log("程序结束");
      rl.close();
      break;
    }
    const agent = new Agent(process.env.DEEPSEEK_API_KEY ?? "", tools);
    const result = await agent.streamRun(inputMessage);
    console.log("结果是: ", result);
    rl.close();
  }
}

main().catch(console.error);
