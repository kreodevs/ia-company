import { admin } from "./admin";
import { auth } from "./auth";
import { code } from "./code";
import { common } from "./common";
import { consensus } from "./consensus";
import { decisions } from "./decisions";
import { help } from "./help";
import { interests } from "./interests";
import { language } from "./language";
import { nav } from "./nav";
import { ops } from "./ops";
import { phase } from "./phase";
import { products } from "./products";
import { runs } from "./runs";
import { settings } from "./settings";
import { status } from "./status";
import { team } from "./team";
import { theme } from "./theme";
import { warRoom } from "./warRoom";
import { workflowDisplay } from "./workflowDisplay";
import { workflows } from "./workflows";

export const en = {
  common,
  nav,
  auth,
  workflows,
  runs,
  consensus,
  decisions,
  ops,
  products,
  settings,
  team,
  warRoom,
  help,
  interests,
  code,
  admin,
  language,
  theme,
  status,
  phase,
  workflowDisplay,
} as const;

export type EnTranslations = typeof en;
