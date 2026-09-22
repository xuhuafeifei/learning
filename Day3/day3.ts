/**
 * 建立一个直接调 LLM API，走通
 * 走通 输入 -> LLM -> 输出
 */

import {
  lsToolSchema,
  readFileToolSchema,
  writeFileToolSchema,
} from "../Day3/tools";
import { Agent } from "./agent";

const inputMessage =
  "你好，我在测试, 去tmp目录下面瞅两眼, 写个测试文件给我看看";

async function main() {
  const agent = new Agent(process.env.DEEPSEEK_API_KEY ?? "", [
    readFileToolSchema,
    lsToolSchema,
    writeFileToolSchema,
  ]);
  // 来一个定时器，4 秒后，调用agent.abort()
  // setTimeout(() => {
  //   agent.abort();
  // }, 9000);
  await agent.streamRun(inputMessage);
}

main();
