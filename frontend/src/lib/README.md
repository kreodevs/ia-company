# Office frontend lib

| Module | Role |
|--------|------|
| `sidebar.ts` | Nav sections/items, collapse + group open persistence, `NavSection.variant` (`operate` = day-to-day block in sidebar) |
| `office-trabajo-links.ts` | Deep links from dashboard activity → `/office/trabajo?tab=activos&run=` |
| `office-chat-config.ts` | Coordinator chat mode (`stream` \| `legacy`), endpoint path, localStorage override — **no `.env`** |
| `coordinator-chat-stream.ts` | Parse TanStack AI message parts (plan, clarifications, approval) |
| `workflow-task-override.ts` | Initial run task for workflow editor — AI Studio brief, skip STUCK consensus |

Default mode is **`stream`** → `POST /office/chat/stream` with tools `ask_clarifying_questions` and `propose_office_task` (needs approval).

To force legacy REST chat:

```ts
import { setOfficeChatMode } from "./office-chat-config";
setOfficeChatMode("legacy");
```

Or edit `officeChatConfig.defaultMode` in `office-chat-config.ts`.
