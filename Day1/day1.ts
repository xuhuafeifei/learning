/**
 * 建立一个直接调 LLM API，走通
 * 走通 输入 -> LLM -> 输出
 */

import { LLMClient } from "./client";

const inputMessage = "你好，我在测试";

async function main() {
    const client = new LLMClient(process.env.DEEPSEEK_API_KEY);
    const message = await client.prompt(inputMessage);
    console.log(JSON.stringify(message, null, 2));
}

main();