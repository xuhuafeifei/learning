import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  lsToolSchema,
  readFileToolSchema,
  writeFileToolSchema,
} from "../Day3/tools";
import { Agent } from "./agent";

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
    await agent.streamRun(inputMessage);
    rl.close();
  }
}

main().catch(console.error);
