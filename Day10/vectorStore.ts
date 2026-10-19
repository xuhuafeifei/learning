// 向量数据库
/**
 * 1. 存储数据格式。 json
 *  1.1 Json 格式： id, content, vector, space【随便搞的，作为 filter 筛选用】
 *  1.2 存储方式，本地文件存储，新增数据 append，不做文件拆分
 * 2. 新增数据，追加到文件末尾
 * 3. vector store暴露能力。
 *  3.1 新增数据
 *  3.2 查询数据
 *  3.3 删除数据
 *  3.4 更新数据
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Embedding } from "../Day8/embedding";
import { Chunker } from "../Day9/chunk";
import { ChunkingStrategy } from "../Day9/chunk";

export class Vector {
  public id: number;
  public content: string;
  public vector: number[];
  public space: string;
  public hash: string;
  public sourcePath: string;

  constructor(
    id: number,
    content: string,
    vector: number[],
    space: string,
    hash: string,
    sourcePath: string,
  ) {
    this.id = id;
    this.content = content;
    this.vector = vector;
    this.space = space;
    this.hash = hash;
    this.sourcePath = sourcePath;
  }
}

export class VectorResult {
  public id: number;
  public content: string;
  public vector: number[];
  public space: string;
  public similarity: number;
  public hash: string;
  public sourcePath: string;

  constructor(
    id: number,
    content: string,
    vector: number[],
    space: string,
    similarity: number,
    hash: string,
    sourcePath: string,
  ) {
    this.id = id;
    this.content = content;
    this.vector = vector;
    this.space = space;
    this.similarity = similarity;
    this.hash = hash;
    this.sourcePath = sourcePath;
  }
}

export class VectorStore {
  private filePath: string;
  private id: number = 0;
  private data: Vector[] = [];
  private hashes: Set<string> = new Set();
  private embedding: Embedding;
  private chunker: Chunker;
  private strategy: ChunkingStrategy;

  constructor(
    embedding: Embedding,
    chunker: Chunker,
    strategy: ChunkingStrategy,
  ) {
    this.embedding = embedding;
    this.chunker = chunker;
    this.strategy = strategy;
    this.filePath = path.join(process.cwd(), "vectorStore.jsonl");
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, "");
    }
    const content = fs.readFileSync(this.filePath, "utf-8");
    this.data = content.trim()
      ? content
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as Vector)
      : [];
    for (const item of this.data) {
      const hash = item.hash ?? this.hashChunk(item.content);
      item.hash = hash;
      this.hashes.add(hash);
    }
    this.id =
      this.data.length > 0
        ? Math.max(...this.data.map((item) => item.id)) + 1
        : 0;
  }

  private hashChunk(chunk: string): string {
    return crypto.createHash("sha256").update(chunk).digest("hex");
  }

  // 新增数据
  public async add(content: string, space: string, sourcePath: string) {
    const chunks = this.chunker.chunk(content, this.strategy);
    // content切片
    for (const chunk of chunks) {
      const hash = this.hashChunk(chunk);
      if (this.hashes.has(hash)) {
        continue;
      }
      const newData: Vector = {
        id: this.id++,
        content: chunk,
        vector: [...(await this.embedding.generateEmbedding(chunk))],
        space: space,
        hash,
        sourcePath,
      };
      this.data.push(newData);
      this.hashes.add(hash);
      // 追加到文件末尾
      fs.appendFileSync(this.filePath, JSON.stringify(newData) + "\n");
    }
  }

  // 查询数据 【query by】
  public async query(
    query: string,
    space: string,
    topK: number = 1,
  ): Promise<VectorResult[]> {
    const result = this.data.filter((item) => item.space === space);
    // 通过向量距离，查询最相似的数据
    const queryVector = await this.embedding.generateEmbedding(query);
    // 在剩下的 result 中，计算向量距离，找到最相似的数据
    const similarData: VectorResult[] = result.map((item) => {
      const similarity = this.embedding.calculateSimilarityByEmbedding(
        queryVector,
        item.vector,
      );
      return {
        id: item.id,
        content: item.content,
        vector: item.vector,
        space: item.space,
        similarity: similarity,
        hash: item.hash,
        sourcePath: item.sourcePath ?? "",
      };
    });
    // 排序，找到最相似的数据
    similarData.sort((a, b) => b.similarity - a.similarity);
    return similarData.slice(0, topK);
  }
}
