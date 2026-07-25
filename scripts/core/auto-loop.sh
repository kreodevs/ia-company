#!/usr/bin/env bash
set -euo pipefail
cat <<'EOF'
DEPRECATED — CLI auto-loop removed from active use.

The v2 platform replaces this script with:
  • Office (/office) — on-demand work via the coordinator
  • Worker (npm run worker) — optional fixed workflow schedules per tenant
  • Consensus in PostgreSQL (not memories/consensus.md)

Original implementation preserved at:
  archive/legacy-cli/scripts/core/auto-loop.sh

See docs/platform.md and archive/legacy-cli/README.md
EOF
exit 1
