import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Agent } from "../Day7/agent";
import { VectorStore } from "../Day10/vectorStore";
import { createVectorStoreTools } from "../Day10/vectorTools";
import { Embedding } from "../Day8/embedding";
import { Chunker, FiftyCharacterChunkingStrategy } from "../Day9/chunk";

const vectorStore = new VectorStore(
  await Embedding.init(),
  new Chunker(),
  new FiftyCharacterChunkingStrategy(),
);
const tools = createVectorStoreTools(vectorStore, "default");

async function main() {
  while (true) {
    const rl = readline.createInterface({ input, output });
    const inputMessage = await rl.question("请输入你的问题: ");
    if (inputMessage.trim().toLowerCase() === "exit") {
      console.log("退出程序");
      rl.close();
      break;
    }
    console.log("你输入的问题是: ", inputMessage);

    const agent = new Agent(process.env.DEEPSEEK_API_KEY ?? "", tools);
    const result = await agent.streamRun(inputMessage);
    console.log("结果是: ", result);
    rl.close();
  }
}

main().catch(console.error);
