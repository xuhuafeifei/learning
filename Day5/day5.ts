import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  lsToolSchema,
  readFileToolSchema,
  writeFileToolSchema,
} from "../Day3/tools";
import { Agent } from "./agent";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("姓名"),
  age: z.number().describe("年龄"),
  email: z.string().email().describe("邮箱"),
});

async function main() {
  while (true) {
    const rl = await readline.createInterface({ input, output });
    const inputMessage = await rl.question("请输入你的问题: ");
    if (inputMessage.trim().toLowerCase() === "exit") {
      console.log("退出程序");
      rl.close();
      break;
    }
    console.log("你输入的问题是: ", inputMessage);

    const agent = new Agent(process.env.DEEPSEEK_API_KEY ?? "", [
      readFileToolSchema,
      lsToolSchema,
      writeFileToolSchema,
    ]);
    const result = await agent.structuredRun<typeof schema>(inputMessage, schema);
    console.log("结果是: ", result);
    rl.close();
  }
}

main().catch(console.error);