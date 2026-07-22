export const code = {
  title: "Code — {{name}}",
  subtitle:
    "Browse every file the agents have produced. You decide when to push to a GitHub repository.",
  productMemory: "← product memory",
  empty: "No files yet. The first run will create README.md, package.json, and src/.",
  pickFile: "Pick a file on the left to preview its contents.",
  loading: "Loading file…",
  couldNotLoad: "Could not load file.",
  truncated: "preview truncated to 1 MB",
  binaryFile: "Binary file — preview not available.",
  publishTitle: "Push to a new GitHub repository",
  publishHelp:
    "Initial commit is created locally and pushed to a fresh GitHub repo using the platform token. The product moves to the Launching phase.",
  repoName: "Repository name",
  visibility: "Visibility",
  createRepo: "Create GitHub repo",
  commit: "Initial commit: {{sha}}",
  phaseGate: "Repo creation requires product phase building, launching or growing. Current: {{phase}}.",
} as const;