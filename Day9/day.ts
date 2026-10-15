// 读取text/txt.md文件
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Chunker,
  FiftyCharacterChunkingStrategy,
  ParagraphChunkingStrategy,
  ThousandCharacterChunkingStrategy,
  TitleChunkingStrategy,
} from "./chunk";
import { Embedding } from "../Day8/embedding";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const text = fs.readFileSync(path.join(__dirname, "../text/txt.md"), "utf-8");

  // 基础语料
  const testQueries = [
    // 简单
    // { query: "Embedding 是什么", expect: "引言或核心思想" },
    // { query: "Word2Vec", expect: "静态词向量" },
    // { query: "余弦相似度", expect: "相似度计算" },
    // { query: "RAG", expect: "典型应用" },
    // { query: "池化", expect: "工作流程第四步" },

    // // 中等
    // { query: "怎么把一句话变成向量", expect: "工作流程" },
    // { query: "Embedding 和 LLM 有什么区别", expect: "第六节" },
    // { query: "词向量的一词多义问题", expect: "静态词向量" },
    // { query: "怎么判断两个向量像不像", expect: "相似度计算" },
    // { query: "中文场景选什么模型", expect: "实践中的坑" },

    // // 困难
    // { query: "为什么独热编码不够用", expect: "第一、二节" },
    // { query: "缓存为什么会吃满内存", expect: "实践中的坑" },
    // { query: "并发调用 Embedding 会怎样", expect: "实践中的坑" },
    // { query: "句子级 Embedding 是怎么来的", expect: "第三节" },
    // { query: "Q4 量化有什么代价", expect: "影响因素" },
    // { query: "余弦相似度永远是", expect: "余弦相似度永远是" },
    {
      query: "embedding到底是干啥的？底层原理是什么",
      expect: "假设词表里有 10000 个词",
    },
  ];

  const chunker = new Chunker();
  // 四个 Embedding，各自对应一种切分策略，缓冲池互不共享
  const runners = [
    {
      strategy: new FiftyCharacterChunkingStrategy(),
      embedding: await Embedding.init(),
    },
    {
      strategy: new ThousandCharacterChunkingStrategy(),
      embedding: await Embedding.init(),
    },
    {
      strategy: new TitleChunkingStrategy(),
      embedding: await Embedding.init(),
    },
    {
      strategy: new ParagraphChunkingStrategy(),
      embedding: await Embedding.init(),
    },
  ];

  for (const { strategy, embedding } of runners) {
    const chunks = chunker.chunk(text, strategy);
    console.log(
      `\nChunking Strategy: ${strategy.constructor.name} (chunks=${chunks.length})`,
    );

    for (const testQuery of testQueries) {
      console.log(`\nQuery: "${testQuery.query}"`);
      const result = await embedding.search(testQuery.query, chunks);
      for (const item of result) {
        console.log(
          `  ${item.similarity.toFixed(4)}  "${item.target.slice(0, 60)}..."`,
        );
      }
    }
    console.log("--------------------------------");
  }

  for (const { embedding } of runners) {
    await embedding.close();
  }
}

main();
