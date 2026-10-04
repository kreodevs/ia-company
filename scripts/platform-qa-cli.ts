/**
 * Ejecuta QA de plataforma dentro del contenedor API (requiere DATABASE_URL).
 *
 * Uso:
 *   npm run qa:platform
 *   QA_TENANT_ID=<cuid> npm run qa:platform
 */
import { runPlatformQa } from "../src/lib/platform-qa.js";

const tenantId = process.env.QA_TENANT_ID?.trim() || null;

const report = await runPlatformQa(tenantId);

console.log(JSON.stringify(report, null, 2));
console.error(
  `\nQA: ${report.summary.pass} pass · ${report.summary.fail} fail · ${report.summary.warn} warn · ${report.summary.skip} skip`,
);

if (report.summary.fail > 0) {
  process.exit(1);
}
