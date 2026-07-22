import { admin } from "./admin";
import { auth } from "./auth";
import { common } from "./common";
import { consensus } from "./consensus";
import { help } from "./help";
import { interests } from "./interests";
import { language } from "./language";
import { nav } from "./nav";
import { ops } from "./ops";
import { phase } from "./phase";
import { runs } from "./runs";
import { settings } from "./settings";
import { status } from "./status";
import { team } from "./team";
import { theme } from "./theme";
import { workflowDisplay } from "./workflowDisplay";
import { workflows } from "./workflows";

export const es = {
  common,
  nav,
  auth,
  workflows,
  runs,
  consensus,
  ops,
  settings,
  team,
  help,
  interests,
  admin,
  language,
  theme,
  status,
  phase,
  workflowDisplay,
} as const;

export type EsTranslations = typeof es;
