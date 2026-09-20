## day1 总结

### client.ts

封装与模型的交互，对外暴露 promt 和stream 接口，分别提供全量，和流式返回能力，对外提供构化数据

### LLM 数据交互流程

用户的输入，会成为 HTTP Post 请求的 Body，发送到 LLM 服务。LLM 会将推理的结果->Token/Content 输出，经由 API Service 包装成可供外部解析的 HTTP Response

如果没有指定 stream，则会返回完整数据

否则，则会以 SSE 标准返回流式数据，其中delta是增量部分

返回端：

LLM -> 字节流 -> 字符流 -> SSE event -> data -> delta 

在流式数据解析过程中，需要意识到，服务端返回的字节流不一定是完成的 SSE event

譬如服务端可以返回 data:{，很明显，服务端返回的数据是残缺的，因此 client 需要对数据进行叠加，得到完整的 SSE 内容

### TOKEN
TOKEN 并不是 API Service 返回的 HTTP Response，而是大模型处理文本的最小单元

你输入或输出的内容，最终会被解构成 TOKEN，TOKEN 介于词，词组之间的一种概念

模型在底层的神经网络中，并不会直接输出字符串，而是输出 Token ID，API 服务拿到 ID 后，解码成字符串。

### API 请求链路

fetch -> LLM API Service 解析数据 -> 执行 LLM 推理 -> LLM 输出 TOKEN -> LLM API Service 解析 TOKEN -> LLM API Service 返回 HTTP Response -> client 代码解析 Response -> 业务代码执行
