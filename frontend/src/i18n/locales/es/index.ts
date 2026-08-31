import { admin } from "./admin";
import { auth } from "./auth";
import { code } from "./code";
import { catalogStudio } from "./catalogStudio";
import { common } from "./common";
import { consensus } from "./consensus";
import { decisions } from "./decisions";
import { help } from "./help";
import { interests } from "./interests";
import { language } from "./language";
import { nav } from "./nav";
import { org } from "./org";
import { office } from "./office";
import { opencode } from "./opencode";
import { ops } from "./ops";
import { pendientes } from "./pendientes";
import { phase } from "./phase";
import { productDesk } from "./productDesk";
import { productDeliveries } from "./productDeliveries";
import { products } from "./products";
import { productWork } from "./productWork";
import { runs } from "./runs";
import { settings } from "./settings";
import { status } from "./status";
import { team } from "./team";
import { theme } from "./theme";
import { warRoom } from "./warRoom";
import { workflowDisplay } from "./workflowDisplay";
import { workflows } from "./workflows";

export const es = {
  common,
  nav,
  auth,
  workflows,
  runs,
  consensus,
  decisions,
  pendientes,
  ops,
  opencode,
  products,
  productDesk,
  productDeliveries,
  productWork,
  settings,
  team,
  warRoom,
  office,
  org,
  help,
  interests,
  code,
  admin,
  language,
  theme,
  status,
  phase,
  workflowDisplay,
  catalogStudio,
} as const;

export type EsTranslations = typeof es;
