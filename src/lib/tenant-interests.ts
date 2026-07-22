import { prisma } from "./prisma.js";

export interface InterestCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
  keywords: string[];
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: "sports",
    label: "Sports",
    emoji: "\u26bd",
    description: "Live scores, betting odds, fan engagement, training, leagues.",
    keywords: [
      "sport",
      "sports",
      "football",
      "soccer",
      "basketball",
      "tennis",
      "nba",
      "nfl",
      "fitness",
      "athlete",
      "league",
      "match",
      "tournament",
      "betting",
      "odds",
      "fantasy",
      "workout",
      "training",
    ],
  },
  {
    id: "gaming",
    label: "Gaming",
    emoji: "\ud83c\udfae",
    description: "Video games, esports, leaderboards, matchmaking, in-game economies.",
    keywords: [
      "game",
      "games",
      "gaming",
      "esport",
      "esports",
      "player",
      "multiplayer",
      "leaderboard",
      "tournament",
      "matchmaking",
      "ranking",
      "steam",
      "console",
      "unity",
      "unreal",
    ],
  },
  {
    id: "crm",
    label: "CRM & Sales",
    emoji: "\ud83d\udcbc",
    description: "Sales pipeline, contact management, deal tracking, customer ops.",
    keywords: [
      "crm",
      "sales",
      "pipeline",
      "lead",
      "leads",
      "contact",
      "deal",
      "prospect",
      "outreach",
      "followup",
      "follow-up",
      "account",
      "opportunity",
    ],
  },
  {
    id: "fintech",
    label: "Fintech",
    emoji: "\ud83d\udcb0",
    description: "Payments, banking, investing, accounting, crypto, lending.",
    keywords: [
      "fintech",
      "payment",
      "payments",
      "banking",
      "bank",
      "invest",
      "investment",
      "portfolio",
      "crypto",
      "lending",
      "loan",
      "invoice",
      "accounting",
      "tax",
      "wallet",
    ],
  },
  {
    id: "health",
    label: "Health & Wellness",
    emoji: "\ud83c\udfe5",
    description: "Telemedicine, fitness, mental health, nutrition, EHR.",
    keywords: [
      "health",
      "medical",
      "doctor",
      "patient",
      "telemedicine",
      "clinic",
      "therapy",
      "mental",
      "nutrition",
      "diet",
      "wellness",
      "ehr",
      "prescription",
    ],
  },
  {
    id: "education",
    label: "Education",
    emoji: "\ud83d\udcda",
    description: "Learning platforms, tutoring, courses, LMS, certifications.",
    keywords: [
      "education",
      "edtech",
      "learning",
      "course",
      "courses",
      "lms",
      "tutor",
      "tutoring",
      "student",
      "teacher",
      "school",
      "certification",
    ],
  },
  {
    id: "devtools",
    label: "Developer Tools",
    emoji: "\ud83d\udee0",
    description: "APIs, SDKs, CLIs, dev infra, observability, code review.",
    keywords: [
      "devtool",
      "developer",
      "api",
      "sdk",
      "cli",
      "ide",
      "debug",
      "observability",
      "monitoring",
      "logging",
      "lint",
      "code review",
      "static analysis",
      "ci",
      "cd",
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    emoji: "\ud83d\udce3",
    description: "SEO, ads, email, content, social, attribution, analytics.",
    keywords: [
      "marketing",
      "seo",
      "ads",
      "advertising",
      "email",
      "newsletter",
      "content",
      "social media",
      "attribution",
      "analytics",
      "campaign",
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    emoji: "\ud83d\uded2",
    description: "Online stores, checkout, inventory, marketplaces, dropshipping.",
    keywords: [
      "ecommerce",
      "e-commerce",
      "shop",
      "store",
      "storefront",
      "cart",
      "checkout",
      "inventory",
      "marketplace",
      "dropship",
      "product catalog",
      "fulfillment",
    ],
  },
  {
    id: "saas-b2b",
    label: "B2B SaaS",
    emoji: "\ud83c\udfe2",
    description: "Vertical SaaS, internal tools, workflow automation, ops platforms.",
    keywords: [
      "saas",
      "b2b",
      "workflow",
      "automation",
      "internal tool",
      "platform",
      "tenant",
      "multi-tenant",
      "subscription",
      "billing",
    ],
  },
  {
    id: "social",
    label: "Social & Community",
    emoji: "\ud83d\udc65",
    description: "Networks, forums, dating, communities, creator platforms.",
    keywords: [
      "social",
      "community",
      "forum",
      "dating",
      "creator",
      "followers",
      "profile",
      "feed",
      "post",
      "comment",
      "dm",
      "chat",
      "group",
    ],
  },
  {
    id: "ai-ml",
    label: "AI / ML",
    emoji: "\ud83e\udd16",
    description: "AI apps, agents, fine-tuning, evals, computer vision, NLP.",
    keywords: [
      "ai",
      "ml",
      "machine learning",
      "llm",
      "agent",
      "agents",
      "fine-tune",
      "finetune",
      "rag",
      "embedding",
      "computer vision",
      "nlp",
      "speech",
      "evaluation",
      "eval",
    ],
  },
  {
    id: "content-creator",
    label: "Content & Creators",
    emoji: "\ud83c\udfac",
    description: "Video, podcasting, newsletters, monetization, creator economy.",
    keywords: [
      "creator",
      "creator economy",
      "video",
      "youtube",
      "podcast",
      "podcasting",
      "newsletter",
      "substack",
      "monetization",
      "tipping",
      "subscription",
    ],
  },
  {
    id: "productivity",
    label: "Productivity",
    emoji: "\u2728",
    description: "Tasks, notes, calendar, focus, project management, second brain.",
    keywords: [
      "productivity",
      "task",
      "tasks",
      "todo",
      "note",
      "notes",
      "calendar",
      "reminder",
      "project management",
      "kanban",
      "second brain",
      "focus",
      "pomodoro",
    ],
  },
];

const CATEGORY_INDEX: Map<string, InterestCategory> = new Map(
  INTEREST_CATEGORIES.map((c) => [c.id, c]),
);

export function getCategory(id: string): InterestCategory | undefined {
  return CATEGORY_INDEX.get(id);
}

export async function listTenantInterests(tenantId: string) {
  return prisma.tenantInterest.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getTenantInterestCategories(tenantId: string): Promise<string[]> {
  const rows = await prisma.tenantInterest.findMany({
    where: { tenantId },
    select: { category: true },
  });
  return rows.map((r) => r.category);
}

export async function setTenantInterests(
  tenantId: string,
  categories: string[],
): Promise<void> {
  const valid = Array.from(
    new Set(
      categories.filter((c): c is string => typeof c === "string" && CATEGORY_INDEX.has(c)),
    ),
  );
  await prisma.$transaction([
    prisma.tenantInterest.deleteMany({ where: { tenantId } }),
    ...(valid.length
      ? [
          prisma.tenantInterest.createMany({
            data: valid.map((category) => ({ tenantId, category, weight: 1 })),
          }),
        ]
      : []),
  ]);
}

export function scoreIdeaAgainstInterests(
  ideaTitle: string,
  ideaDescription: string | null | undefined,
  interestCategories: string[],
): number {
  if (interestCategories.length === 0) return 0;
  const haystack = `${ideaTitle} ${ideaDescription ?? ""}`.toLowerCase();
  if (!haystack.trim()) return 0;

  let score = 0;
  for (const catId of interestCategories) {
    const cat = CATEGORY_INDEX.get(catId);
    if (!cat) continue;
    for (const kw of cat.keywords) {
      if (haystack.includes(kw)) {
        score += 1;
      }
    }
  }
  return score;
}

export function formatInterestsPromptSection(categories: string[]): string {
  if (categories.length === 0) return "";
  const lines = categories
    .map((id) => CATEGORY_INDEX.get(id))
    .filter((c): c is InterestCategory => Boolean(c))
    .map((c) => `- ${c.label} (${c.id}): ${c.description}`);
  if (lines.length === 0) return "";
  return `\n## Tenant interests\nThe tenant is actively building in these categories. Bias discovery toward them (still surface off-interest gems only if very high signal):\n${lines.join("\n")}\n`;
}