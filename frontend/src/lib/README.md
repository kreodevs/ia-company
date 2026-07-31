# Office frontend lib

| Module | Role |
|--------|------|
| `office-chat-config.ts` | Coordinator chat mode (`stream` \| `legacy`), endpoint path, localStorage override — **no `.env`** |
| `coordinator-chat-stream.ts` | Parse TanStack AI message parts (plan, clarifications, approval) |

Default mode is **`stream`** → `POST /office/chat/stream` with tools `ask_clarifying_questions` and `propose_office_task` (needs approval).

To force legacy REST chat:

```ts
import { setOfficeChatMode } from "./office-chat-config";
setOfficeChatMode("legacy");
```

Or edit `officeChatConfig.defaultMode` in `office-chat-config.ts`.
