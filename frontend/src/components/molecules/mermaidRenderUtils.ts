import mermaid from "mermaid";

let initialized = false;

export async function initMermaidTheme() {
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "strict",
    });
    initialized = true;
  }
  return mermaid;
}
