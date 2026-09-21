/**
 * 建立一个直接调 LLM API，走通
 * 走通 输入 -> LLM -> 输出
 */

import { Agent } from "./agent";
import { getWeatherToolSchema } from "./tools";

const inputMessage = "你好，我在测试, 调用一下工具试试, 获取一下北京天气。";

async function main() {
  const agent = new Agent(process.env.DEEPSEEK_API_KEY ?? "", [
    getWeatherToolSchema,
  ]);
  await agent.streamRun(inputMessage);
}

main();
