import { ToolSchema } from "../Day7/tools";
import { VectorResult, VectorStore } from "./vectorStore";

export function createSearchToolSchema(
  vectorStore: VectorStore,
  space: string,
  topK: number = 10,
): ToolSchema {
  return {
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
    execute: async (args: {
      query: string;
    }): Promise<Omit<VectorResult, "vector">[]> => {
      const result = await vectorStore.query(args.query, space, topK);
      return result.map(({ vector: _, ...rest }) => rest);
    },
  };
}

export function createPersistToolSchema(
  vectorStore: VectorStore,
  space: string,
): ToolSchema {
  return {
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
          sourcePath: {
            type: "string",
            description: "文章路径",
          },
        },
        required: ["content", "sourcePath"],
      },
    },
    execute: async (args: { content: string; sourcePath: string }) => {
      await vectorStore.add(args.content, space, args.sourcePath);
    },
  };
}

export function createVectorStoreTools(
  vectorStore: VectorStore,
  space: string,
  topK: number = 10,
): ToolSchema[] {
  return [
    createSearchToolSchema(vectorStore, space, topK),
    createPersistToolSchema(vectorStore, space),
  ];
}
