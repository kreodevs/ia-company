import snapog from "./snapog.json" with { type: "json" };
import type { VerticalPackManifest } from "../../lib/vertical-packs.js";

/** Shipped with the API image — keep in sync with projects/{slug}/vertical-pack.json */
export const BUNDLED_VERTICAL_PACKS: VerticalPackManifest[] = [snapog as VerticalPackManifest];
