                    Agent Runtime
                         │
                         ▼
                   ┌───────────┐
                   │    LLM    │
                   └─────┬─────┘
                         │
                 finish_reason
                    /          \
                 stop         tool_calls
                  │               │
                  ▼               ▼
                结束          Tool Runtime
                                  │
                         ┌────────┴────────┐
                         │                 │
                      success            error
                         │                 │
                         └────────┬────────┘
                                  ▼
                              Tool Result
                                  │
                                  ▼
                                 LLM
                                  │
                                  ↺

Runtime 同时负责：
maxLoop
abort
exception
tool error
request lifecycle

---

LLM 想干什么
↓
Runtime
├── maxLoop
├── tool error handling
├── timeout / abort
├── request lifecycle
└── streaming aggregation
↓
决定是否允许继续
