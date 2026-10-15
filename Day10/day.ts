// 读取txt文件，并存储到向量数据库
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import { VectorStore } from "./vectorStore";
import { Chunker, FiftyCharacterChunkingStrategy } from "../Day9/chunk";
import { Embedding } from "../Day8/embedding";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const txtFilePath = path.join(__dirname, "../text/txt.md");
const txtContent = fs.readFileSync(txtFilePath, "utf-8");

async function main() {
  const embedding = await Embedding.init();
  const chunker = new Chunker();
  const strategy = new FiftyCharacterChunkingStrategy();
  const vectorStore = new VectorStore(embedding, chunker, strategy);

  await vectorStore.add(txtContent, "default");
  console.log("存储完成");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const query = await new Promise<string>((resolve) => {
      rl.question("请输入查询内容: ", resolve);
    });
    if (query === "exit") {
      break;
    }
    const result = (await vectorStore.query(query, "default"))[0];
    console.log(result.content, result.similarity);
  }

  rl.close();
}

main();
