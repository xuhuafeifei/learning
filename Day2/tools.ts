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
