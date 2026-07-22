# Frontend i18n

Internationalization for Auto-Company Platform UI.

## Stack

- **i18next** + **react-i18next**
- Default locale: **Spanish (`es`)**
- Supported: `es`, `en`
- Persistence: `localStorage` key `auto-company-lang`

## Usage

```tsx
import { useTranslation } from "react-i18next";

function MyPage() {
  const { t, i18n } = useTranslation();
  return <h1>{t("workflows.list.title")}</h1>;
}
```

Change language programmatically:

```tsx
import { setAppLanguage } from "../i18n";

setAppLanguage("en");
```

## Locale modules

Under `locales/es/` and `locales/en/`:

| Module | Keys prefix |
|--------|-------------|
| `common.ts` | `common.*` |
| `nav.ts` | `nav.*` |
| `auth.ts` | `auth.*` |
| `workflows.ts` | `workflows.*`, `agents.*`, `skills.*` |
| `runs.ts` | `runs.*`, `runDetail.*` |
| `consensus.ts` | `consensus.*` |
| `ops.ts` | `ops.*` |
| `settings.ts` | `settings.*` |
| `team.ts` | `team.*` |
| `help.ts` | `help.*` |
| `admin.ts` | `admin.*` |
| `language.ts` | `language.*` |
| `status.ts` | `status.*` |
| `phase.ts` | `phase.*` |
| `workflowDisplay.ts` | `workflowDisplay.*` |

## Help markdown

Long-form help is **not** in JSON — see `src/content/help/` with `getHelpArticles(lang)`.

## API errors

`src/lib/translate-error.ts` maps generic English API messages to localized fallbacks.
