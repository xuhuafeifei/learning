import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Chunker,
  FiftyCharacterChunkingStrategy,
  ThousandCharacterChunkingStrategy,
} from "./chunk";
import { Embedding } from "../Day8/embedding";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const text = fs.readFileSync(path.join(__dirname, "../text/txt.md"), "utf-8");
  const chunker = new Chunker();

  const emb500 = await Embedding.init();
  const emb1000 = await Embedding.init();
  const chunks500 = chunker.chunk(text, new FiftyCharacterChunkingStrategy());
  const chunks1000 = chunker.chunk(
    text,
    new ThousandCharacterChunkingStrategy(),
  );

  console.log(`500 chunks=${chunks500.length}, 1000 chunks=${chunks1000.length}`);

  const queries = [
    "embedding到底是干啥的？底层原理是什么",
    "为什么独热编码不够用",
    "Word2Vec 的一词多义问题",
    "句子级 Embedding 是怎么来的",
    "怎么判断两个向量像不像",
    "缓存为什么会吃满内存",
    "Q4 量化有什么代价",
    "Embedding 和 LLM 有什么区别",
  ];

  for (const query of queries) {
    const hits500 = await emb500.search(query, chunks500);
    const hits1000 = await emb1000.search(query, chunks1000);

    console.log(`\nQuery: "${query}"`);
    console.log("[500]");
    for (const item of hits500) {
      console.log(
        `  ${item.similarity.toFixed(4)}  "${item.target.slice(0, 60).replace(/\n/g, " ")}..."`,
      );
    }
    console.log("[1000]");
    for (const item of hits1000) {
      console.log(
        `  ${item.similarity.toFixed(4)}  "${item.target.slice(0, 60).replace(/\n/g, " ")}..."`,
      );
    }
  }

  await emb500.close();
  await emb1000.close();
}

main();
