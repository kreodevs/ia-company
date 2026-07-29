export const WAR_ROOM_GENERAL_VALUE = "__general__";

export const ROLE_EMOJI: Record<string, string> = {
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

export type WarRoomSeatStatus = "idle" | "queued" | "thinking";

export interface WarRoomSeatAgent {
  id: string;
  name: string;
  role: string;
  status: WarRoomSeatStatus;
  currentTask?: string | null;
}

export function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `radial-gradient(circle at 30% 25%, hsl(${hue} 90% 70%) 0%, hsl(${hue} 70% 45%) 55%, hsl(${(hue + 25) % 360} 80% 30%) 100%)`;
}

export function statusRingColor(status: WarRoomSeatStatus): string {
  if (status === "thinking") return "rgba(96, 165, 250, 0.85)";
  if (status === "queued") return "rgba(251, 191, 36, 0.85)";
  return "rgba(148, 163, 184, 0.45)";
}

export function positionOnCircle(index: number, total: number, radiusPct: number): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: 50 + Math.cos(angle) * radiusPct,
    y: 50 + Math.sin(angle) * radiusPct,
  };
}

export function shortTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function seatRadiusPct(total: number): number {
  if (total <= 4) return 40;
  if (total <= 8) return 42;
  if (total <= 12) return 44;
  if (total <= 16) return 42;
  return 40;
}
