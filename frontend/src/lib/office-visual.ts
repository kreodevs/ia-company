/** Display labels for agent slugs — roles, not persona names. */

export const AGENT_EMOJI: Record<string, string> = {
  "coordinator-chief": "🎩",
  "ceo-bezos": "👔",
  "cto-vogels": "🛠️",
  "cfo-campbell": "💰",
  "critic-munger": "🧐",
  "research-thompson": "🔍",
  "product-norman": "🧭",
  "interaction-cooper": "🎯",
  "ui-duarte": "🎨",
  "fullstack-dhh": "💻",
  "qa-bach": "🧪",
  "devops-hightower": "🚀",
  "marketing-godin": "📣",
  "operations-pg": "📈",
  "sales-ross": "💼",
};

export function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `radial-gradient(circle at 30% 25%, hsl(${hue} 90% 70%) 0%, hsl(${hue} 70% 45%) 55%, hsl(${(hue + 25) % 360} 80% 30%) 100%)`;
}

/** i18n keys under office.roles.* */
export const AGENT_ROLE_LABEL_KEYS: Record<string, string> = {
  "coordinator-chief": "office.roles.coordinator",
  "ceo-bezos": "office.roles.strategyLead",
  "cto-vogels": "office.roles.architecture",
  "cfo-campbell": "office.roles.finance",
  "critic-munger": "office.roles.risk",
  "research-thompson": "office.roles.research",
  "product-norman": "office.roles.product",
  "interaction-cooper": "office.roles.interaction",
  "ui-duarte": "office.roles.design",
  "fullstack-dhh": "office.roles.engineering",
  "qa-bach": "office.roles.quality",
  "devops-hightower": "office.roles.devops",
  "marketing-godin": "office.roles.marketing",
  "operations-pg": "office.roles.operations",
  "sales-ross": "office.roles.sales",
};

export function agentRoleLabelKey(agentName: string): string {
  return AGENT_ROLE_LABEL_KEYS[agentName] ?? "office.roles.specialist";
}
