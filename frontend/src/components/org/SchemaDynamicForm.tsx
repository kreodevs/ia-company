import { useMemo, useState } from "react";
import type { DynamicFormField, DynamicFormSection, OrgUnitConfigSchema } from "../../lib/org-types";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

export interface SchemaDynamicFormProps {
  schema: OrgUnitConfigSchema;
  initialValues?: Record<string, unknown>;
  submitText?: string;
  submitting?: boolean;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
}

function fieldDefault(field: DynamicFormField, values: Record<string, unknown>): unknown {
  if (values[field.name] !== undefined) return values[field.name];
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "multiselect") return [];
  if (field.type === "switch") return false;
  return "";
}

export default function SchemaDynamicForm({
  schema,
  initialValues = {},
  submitText = "Save",
  submitting = false,
  onSubmit,
}: SchemaDynamicFormProps) {
  const sections: DynamicFormSection[] = useMemo(() => {
    if (schema.sections?.length) return schema.sections;
    if (schema.fields?.length) return [{ title: "Configuration", fields: schema.fields }];
    return [];
  }, [schema]);

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const next: Record<string, unknown> = { ...initialValues };
    for (const section of sections) {
      for (const field of section.fields) {
        next[field.name] = fieldDefault(field, next);
      }
    }
    return next;
  });

  const setField = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(values);
      }}
    >
      {sections.map((section) => (
        <fieldset key={section.title} className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
          <legend className="px-1 text-sm font-semibold">{section.title}</legend>
          {section.description && (
            <p className="text-xs text-[var(--color-muted-foreground)]">{section.description}</p>
          )}
          <div className="grid gap-4 md:grid-cols-12">
            {section.fields.map((field) => (
              <div
                key={field.name}
                className={field.colSpan === 6 ? "md:col-span-6" : "md:col-span-12"}
              >
                <label className="mb-1 block text-xs font-medium text-[var(--color-muted-foreground)]">
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    className="min-h-[88px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    value={String(values[field.name] ?? "")}
                    placeholder={field.placeholder}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                ) : field.type === "select" && field.options ? (
                  <Select
                    value={String(values[field.name] ?? "")}
                    onChange={(v) => setField(field.name, v)}
                    options={field.options.map((o) => ({ value: o.value, label: o.label }))}
                    ariaLabel={field.label}
                  />
                ) : field.type === "multiselect" && field.options ? (
                  <div className="flex flex-wrap gap-2">
                    {field.options.map((opt) => {
                      const selected = Array.isArray(values[field.name])
                        ? (values[field.name] as string[]).includes(opt.value)
                        : false;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={
                            selected
                              ? "rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)]/15 px-3 py-1 text-xs font-medium text-[var(--color-primary)]"
                              : "rounded-full border border-[var(--color-border)] px-3 py-1 text-xs"
                          }
                          onClick={() => {
                            const current = Array.isArray(values[field.name])
                              ? [...(values[field.name] as string[])]
                              : [];
                            const next = current.includes(opt.value)
                              ? current.filter((v) => v !== opt.value)
                              : [...current, opt.value];
                            setField(field.name, next);
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                ) : field.type === "switch" ? (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.name])}
                      onChange={(e) => setField(field.name, e.target.checked)}
                    />
                    {field.helpText ?? field.label}
                  </label>
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
                    value={String(values[field.name] ?? "")}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setField(
                        field.name,
                        field.type === "number" ? Number(e.target.value) : e.target.value,
                      )
                    }
                  />
                )}
                {field.helpText && field.type !== "switch" && (
                  <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">{field.helpText}</p>
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <Button type="submit" disabled={submitting}>
        {submitText}
      </Button>
    </form>
  );
}
