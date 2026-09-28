                         Agent
                           │
                    ┌──────┴──────┐
                    │             │
                Agent Runtime   Structured Runtime
                    │             │
                 Tools          No Tools
                    │             │
               Context A       Context B
                    │             │
                    ▼             ▼
                   LLM           LLM
                    │             │
              Tool Calling   Structured Output
                    │             │
              execute tool    JSON.parse
                    │             │
                    ▼             ▼
               Tool Result     Zod.parse
                    │             │
                    └──────┬──────┘
                           │
                         Result