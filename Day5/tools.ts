import { readFileSync, writeFileSync } from "fs";
import { readdir } from "fs/promises";

export interface ToolSchema {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: {
        [key: string]: any;
      };
      required: string[];
    };
  };
  execute: (args: any) => any;
}

// 定义工具 schema
export const getWeatherToolSchema: ToolSchema = {
  type: "function",
  function: {
    name: "get_weather",
    description:
      "Get weather of a location, the user should supply a location first.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA",
        },
      },
      required: ["location"],
    },
  },
  execute: getWeatherTool,
};

export function getWeatherTool(args: { location: string }) {
  return "The weather in " + args.location + " is sunny.";
}

// -------------------------
export const readFileToolSchema: ToolSchema = {
  type: "function",
  function: {
    name: "read_file",
    description: "Read a file",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the file to read",
        },
      },
      required: ["path"],
    },
  },
  execute: read,
};

export function read(args: { path: string }) {
  console.log("read", args.path);
  return readFileSync(args.path, "utf8");
}

// -------------------------
export const lsToolSchema: ToolSchema = {
  type: "function",
  function: {
    name: "ls",
    description: "List a directory",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the directory to list",
        },
      },
      required: ["path"],
    },
  },
  execute: ls,
};

export async function ls(args: { path: string }) {
  console.log("ls", args.path);
  const files = await readdir(args.path);
  console.log("files", files);
  return files;
}

// -------------------------
export const writeFileToolSchema: ToolSchema = {
  type: "function",
  function: {
    name: "write_file",
    description: "Write a file",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The path to the file to write",
        },
        content: {
          type: "string",
          description: "The content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  execute: write,
}

export function write(args: { path: string; content: string }) {
  console.log("write", args.path, args.content);
  return writeFileSync(args.path, args.content);
}
