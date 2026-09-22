## day2 总结

### 为什么要toolSchema

LLM 无法直接调用用户代码中的 tool，只能通过语言描述告诉 LLM，代码中存在何种 tool 工具

如果是纯粹的语言描述，可能存在歧义，因此引入 toolSchema，通过 JSON 的格式化信息规定工具范式

以此辅助 LLM 理清如何调用，以及调用何种工具，然后通过 API Service 返回的数据，告诉本地代码需要做何种操作

如果本地代码检测到 LLM 需要调用工具，则执行对应工具，并将结果返回给 LLM，以此完整调用

### Agent和普通 Chat 最大的区别

普通 Chat，只是单纯返回 LLM 数据

而 Agent，则是 LLM 深度接入整个 runtime，Agent 代码通过 LLM 返回的标识判断是否终结

### SSE or prompt

Agent处理单次调用，核心在于判断当前轮次是否结束，以及是否需要进行工具调用

Agent 在处理 SSE 时，核心是把 SSE 返回的增量数据聚合成完成的可用数据，然后进行数据判断，进行不同的逻辑处理。

譬如聚合得到完整的 thinking 数据，聚合得到完整的 content 数据，亦或是完整的 tool Call

Agent 需要通过 finish_reason判断当前轮次应该做何种处理

----

## ChatGpt 总结版

Day2：Agent Loop + Tool Calling

1. ToolSchema
LLM 不能直接执行本地代码。
ToolSchema 用结构化信息描述可用工具及其参数，
让 LLM 能生成规范的 Tool Call。

Schema → 给 LLM 看
execute → Runtime 执行

2. Agent Loop
LLM 决定“这一轮是否需要继续行动”，
Runtime 负责执行、约束和终止循环。

LLM → Tool Call → Runtime 执行 Tool
     ↑                  ↓
     └──── Tool Result ┘

3. Agent vs Chat
Chat 核心是生成回答。
Agent 核心是 LLM + Runtime 驱动的行动循环。

4. Streaming
SSE 只是数据传输方式。
LLM Streaming 返回的是增量 delta，
Runtime 必须将 delta 聚合成完整 message/tool call。

最终通过 finish_reason 判断：
stop       → 本轮完成
tool_calls → 执行工具并进入下一轮