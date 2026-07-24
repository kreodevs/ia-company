# Product components

| Component | Role |
|-----------|------|
| `AddProductDialog` | Register a product from GitHub URL with optional intake workflow |
| `ProductAgentDocsPanel` | Agent deliverables and docs for a product |
| `ProductLastRunPanel` | Summary of the latest run with per-agent output preview modal |
| `AgentOutputPreviewModal` | Markdown preview dialog for a single agent step output |

## Work assignment

Product work is commissioned through the **coordinator chat** in the war room (`WarRoomContent` → `CoordinatorChat` with `productId`). The coordinator proposes team and plan; the user approves before execution.

Product configuration lives at `/products/:id/settings` (`ProductSettingsPage`).

The Office (`/office`) uses the same coordinator with optional product scope.

## API

`GET /products/importable`, `POST /products/register`, `POST /products/:id/intake`, `PUT /products/:id` (incl. `githubRepoUrl`), `POST /products/bootstrap`, `GET /products/:id/agent-docs`, `GET /products/:id/last-run`.

Launch endpoints (`/launch-options`, `/launch`) remain on the API for the coordinator backend and scripts.
