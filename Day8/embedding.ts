import {
  getLlama,
  Llama,
  LlamaEmbeddingContext,
  LlamaModel,
} from "node-llama-cpp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Embedding {
  private llama: Llama;
  private model: LlamaModel;
  private context: LlamaEmbeddingContext;
  /** 实例私有缓冲池：text -> vector */
  private cache = new Map<string, readonly number[]>();
  /** 并发去重：同一 text 只算一次 */
  private pending = new Map<string, Promise<readonly number[]>>();

  private constructor(
    llama: Llama,
    model: LlamaModel,
    context: LlamaEmbeddingContext,
  ) {
    this.llama = llama;
    this.model = model;
    this.context = context;
  }

  static async init(): Promise<Embedding> {
    const llama = await getLlama();
    const model = await llama.loadModel({
      modelPath: path.join(
        __dirname,
        "../model/nomic-embed-text-v1.5.Q4_K_M.gguf",
      ),
    });
    const context = await model.createEmbeddingContext();
    return new Embedding(llama, model, context);
  }

  async generateEmbedding(text: string): Promise<readonly number[]> {
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    const inflight = this.pending.get(text);
    if (inflight) {
      return inflight;
    }

    const promise = this.context
      .getEmbeddingFor(text)
      .then(({ vector }) => {
        this.cache.set(text, vector);
        this.pending.delete(text);
        return vector;
      })
      .catch((error) => {
        this.pending.delete(text);
        throw error;
      });

    this.pending.set(text, promise);
    return promise;
  }

  calculateSimilarityByEmbedding(
    embedding1: readonly number[],
    embedding2: readonly number[],
  ): number {
    const dotProduct = embedding1.reduce(
      (acc, val, index) => acc + val * embedding2[index],
      0,
    );
    const magnitude1 = Math.sqrt(
      embedding1.reduce((acc, val) => acc + val * val, 0),
    );
    const magnitude2 = Math.sqrt(
      embedding2.reduce((acc, val) => acc + val * val, 0),
    );
    return dotProduct / (magnitude1 * magnitude2);
  }

  async calculateSimilarity(
    input: string,
    targetList: readonly string[],
  ): Promise<{ target: string; similarity: number }[]> {
    const inputEmbedding = await this.generateEmbedding(
      `search_query: ${input}`,
    );
    const similarityList = await Promise.all(
      targetList.map(async (target) => {
        const targetEmbedding = await this.generateEmbedding(
          `search_document: ${target}`,
        );
        const similarity = this.calculateSimilarityByEmbedding(
          inputEmbedding,
          targetEmbedding,
        );
        return { target, similarity };
      }),
    );
    return similarityList
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  search(
    input: string,
    targetList: readonly string[],
  ): Promise<{ target: string; similarity: number }[]> {
    return this.calculateSimilarity(input, targetList);
  }

  clearCache(): void {
    this.cache.clear();
    this.pending.clear();
  }

  async close(): Promise<void> {
    this.clearCache();
    await this.model.dispose();
    await this.llama.dispose();
  }
}
