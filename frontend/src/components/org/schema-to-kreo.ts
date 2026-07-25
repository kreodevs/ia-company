import type {
  DynamicFormField as OrgField,
  DynamicFormSection as OrgSection,
  OrgUnitConfigSchema,
} from "../../lib/org-types";
import type {
  DynamicFormField as KreoField,
  DynamicFormSection as KreoSection,
  DynamicFieldType,
} from "../organisms/DynamicForm";

const ORG_TO_KREO_TYPE: Record<OrgField["type"], DynamicFieldType> = {
  text: "text",
  textarea: "textarea",
  select: "select",
  multiselect: "multiselect",
  switch: "switch",
  number: "number",
  color: "color",
  email: "email",
};

function mapField(field: OrgField, initialValues: Record<string, unknown>): KreoField {
  const colSpan = field.colSpan === 6 ? 6 : 12;
  const defaultValue =
    initialValues[field.name] !== undefined ? initialValues[field.name] : field.defaultValue;

  return {
    name: field.name,
    label: field.label,
    type: ORG_TO_KREO_TYPE[field.type],
    placeholder: field.placeholder,
    description: field.helpText,
    required: field.required,
    options: field.options?.map((o) => ({ label: o.label, value: o.value })),
    colSpan: colSpan as KreoField["colSpan"],
    defaultValue,
  };
}

export function orgSchemaToKreoSections(
  schema: OrgUnitConfigSchema,
  initialValues: Record<string, unknown>,
): KreoSection[] {
  const orgSections: OrgSection[] = schema.sections?.length
    ? schema.sections
    : schema.fields?.length
      ? [{ title: "Configuration", fields: schema.fields }]
      : [];

  return orgSections.map((section, index) => ({
    id: `section-${index}-${section.title.replace(/\s+/g, "-").toLowerCase()}`,
    title: section.title,
    description: section.description,
    fields: section.fields.map((field) => mapField(field, initialValues)),
  }));
}
