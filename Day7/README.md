完整的 Agent 结构

整体架构

agent -> contextManager -> LLM -> Tool ? -Y-> turn to contextManager ? else quit

contextManager -> persistent -> jsonl
               -> context (tool, user, assitant)