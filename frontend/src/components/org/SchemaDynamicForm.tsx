import { useMemo } from "react";
import type { OrgUnitConfigSchema } from "../../lib/org-types";
import { DynamicForm } from "../organisms/DynamicForm";
import { orgSchemaToKreoSections } from "./schema-to-kreo";

export interface SchemaDynamicFormProps {
  schema: OrgUnitConfigSchema;
  initialValues?: Record<string, unknown>;
  submitText?: string;
  submitting?: boolean;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
}

export default function SchemaDynamicForm({
  schema,
  initialValues = {},
  submitText = "Save",
  submitting = false,
  onSubmit,
}: SchemaDynamicFormProps) {
  const sections = useMemo(
    () => orgSchemaToKreoSections(schema, initialValues),
    [schema, initialValues],
  );

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="kreo-org">
      <DynamicForm
        sections={sections}
        variant="default"
        submitText={submitText}
        submitting={submitting}
        onSubmit={(data) => void onSubmit(data as Record<string, unknown>)}
      />
    </div>
  );
}
