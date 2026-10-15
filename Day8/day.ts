import { Embedding } from "./embedding";
import readline from "readline";

const arr = ["Redis 分布式锁", "Redis Cluster", "Java synchronized"];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const embedding = await Embedding.init();
  while (true) {
    const input = await new Promise<string>((resolve) => {
      rl.question("请输入要查询的内容: ", (answer) => {
        resolve(answer);
      });
    });
    if (input === "exit") {
      break;
    }
    const similarityList = await embedding.calculateSimilarity(input, arr);
    console.log(similarityList.map((item) => item.target).join(", "));
  }
  rl.close();
  await embedding.close();
}

main();
