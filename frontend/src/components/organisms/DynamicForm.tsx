import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

// Core Form Components
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './Form';

// Atomic Inputs
import { InputText } from '../atoms/InputText';
import { Textarea } from '../atoms/Textarea';
import { Password } from '../atoms/Password';
import { Dropdown } from '../molecules/Dropdown';
import { MultiSelect } from '../atoms/MultiSelect';
import { Checkbox } from '../atoms/Checkbox';
import { FileUpload } from './FileUpload';
import { Button } from '../atoms/Button';

// Advanced Inputs
import { MarkdownEditorWysiwyg } from '../molecules/MarkdownEditorWysiwyg';
import { RichTextEditor } from '../molecules/RichTextEditor';
import { TagInput } from '../molecules/TagInput';
import { PhoneInput } from '../molecules/PhoneInput';
import { Cascader, type CascaderOption } from '../molecules/Cascader';
import { NumberField } from '../atoms/NumberField';
import { ColorPicker } from '../atoms/ColorPicker';
import { Rating } from '../atoms/Rating';
import { Switch } from '../atoms/Switch';
import { CurrencyInput } from '../molecules/CurrencyInput';
import { Calendar } from '../molecules/Calendar';
import { RoleFlagsGroup } from '../molecules/RoleFlagsGroup';
import { DEFAULT_LEGACY_ROLE_FLAGS } from '@/lib/rbac-mappers';

export type DynamicFieldType =
    | 'text' | 'email' | 'password' | 'number' | 'number-field' | 'currency' | 'phone' | 'cascader' | 'textarea'
    | 'select' | 'multiselect' | 'checkbox' | 'switch' | 'file'
    | 'richtext' | 'html-richtext' | 'tags' | 'color' | 'rating' | 'date' | 'role-flags';

export interface DynamicFieldOption {
    label: string;
    value: string | number;
}

export interface DynamicFormField {
    name: string;
    type: DynamicFieldType;
    label: string;
    placeholder?: string;
    description?: string;
    options?: DynamicFieldOption[]; // Para select, multiselect
    cascaderOptions?: CascaderOption[]; // Para cascader jerárquico
    required?: boolean | string; // Booleano o Mensaje de error personalizado
    min?: number;
    max?: number;
    pattern?: RegExp;
    patternMessage?: string;
    colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; // Grid layout md (12 columnas)
    defaultValue?: any;
    className?: string;
}

export interface DynamicFormSection {
    id: string;
    title?: string;
    description?: string;
    fields: DynamicFormField[];
}

export interface DynamicFormProps {
    fields?: DynamicFormField[]; // Opción 1: Lista plana
    sections?: DynamicFormSection[]; // Opción 2: Secciones con títulos
    onSubmit: (data: any) => void;
    submitText?: string;
    submitClassName?: string;
    cancelText?: string;
    onCancel?: () => void;
    className?: string;
    variant?: 'default' | 'premium' | 'glass';
    loading?: boolean; // Muestra skeleton mientras carga datos
    submitting?: boolean; // Deshabilita el formulario durante submit
}

// Mapper para que el Purge de Tailwind respece las clases dinamicas interpoladas
const colSpanResolver: Record<number, string> = {
    1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4',
    5: 'md:col-span-5', 6: 'md:col-span-6', 7: 'md:col-span-7', 8: 'md:col-span-8',
    9: 'md:col-span-9', 10: 'md:col-span-10', 11: 'md:col-span-11', 12: 'md:col-span-12',
};

export const DynamicForm = ({
    fields = [],
    sections = [],
    onSubmit,
    submitText = 'Guardar',
    submitClassName,
    cancelText,
    onCancel,
    className,
    variant = 'default',
    loading = false,
    submitting = false
}: DynamicFormProps) => {

    // Si está cargando, mostrar skeleton
    if (loading) {
        const skeletonSections = sections.length > 0 ? sections.length : 1;
        return (
            <div className={cn("w-full space-y-[var(--spacing-xl)]", className)}>
                {Array.from({ length: skeletonSections }).map((_, sIdx) => (
                    <div key={sIdx} className="col-span-12 bg-[var(--background)] border border-[var(--border)] rounded-2xl p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] space-y-[var(--spacing-xl)] shadow-sm">
                        <div className="space-y-[var(--spacing-sm)] border-b border-[var(--border)]/60 pb-[var(--spacing-lg)] mb-[var(--spacing-lg)]">
                            <div className="h-5 w-48 rounded bg-[var(--muted)] animate-pulse" />
                            <div className="h-3.5 w-72 rounded bg-[var(--muted)] animate-pulse opacity-60" />
                        </div>
                        <div className="grid grid-cols-12 gap-x-[var(--spacing-lg)] gap-y-7">
                            {Array.from({ length: 4 }).map((_, fIdx) => (
                                <div key={fIdx} className="col-span-6 space-y-[var(--spacing-sm)]">
                                    <div className="h-3 w-20 rounded bg-[var(--muted)] animate-pulse" />
                                    <div className="h-10 w-full rounded-[var(--radius)] bg-[var(--muted)] animate-pulse" />
                                    <div className="h-3 w-32 rounded bg-[var(--muted)] animate-pulse opacity-60" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="flex justify-end gap-[var(--spacing-md)]">
                    {onCancel && <div className="h-10 w-24 rounded-[var(--radius)] bg-[var(--muted)] animate-pulse" />}
                    <div className="h-10 w-[140px] rounded-[var(--radius)] bg-[var(--muted)] animate-pulse" />
                </div>
            </div>
        );
    }

    // Aplanar campos para el procesamiento de lógica de formulario
    const allFields = useMemo(() => {
        if (sections.length > 0) {
            return sections.flatMap(s => s.fields);
        }
        return fields;
    }, [fields, sections]);

    // Generar schema de Zod Mapped
    const formSchema = useMemo(() => {
        const shape: Record<string, z.ZodTypeAny> = {};

        allFields.forEach(field => {
            let validator: any;
            const reqMessage = typeof field.required === 'string' ? field.required : 'Este campo es obligatorio';

            if (field.type === 'number' || field.type === 'number-field' || field.type === 'currency' || field.type === 'rating') {
                validator = z.coerce.number();
                if (field.min !== undefined) validator = validator.min(field.min, `Valor mínimo es ${field.min}`);
                if (field.max !== undefined) validator = validator.max(field.max, `Valor máximo es ${field.max}`);
            } else if (field.type === 'checkbox' || field.type === 'switch') {
                validator = z.boolean();
                if (field.required) {
                    validator = validator.refine((val: boolean) => val === true, reqMessage);
                }
            } else if (field.type === 'role-flags') {
                validator = z.object({
                    admin: z.boolean(),
                    sales: z.boolean(),
                    warehouse: z.boolean(),
                });
            } else if (field.type === 'multiselect' || field.type === 'tags' || field.type === 'cascader') {
                validator = z.array(z.any());
                if (field.required) validator = validator.min(1, reqMessage);
            } else if (field.type === 'file') {
                validator = z.any();
                if (field.required) {
                    validator = validator.refine((val: any) => Array.isArray(val) && val.length > 0, reqMessage);
                }
            } else if (field.type === 'date') {
                validator = z.date({
                    invalid_type_error: "Fecha inválida",
                    required_error: reqMessage
                } as any);
                if (!field.required) {
                    validator = validator.nullable().optional();
                }
            } else {
                validator = z.string();
                if (field.type === 'email') validator = validator.email('Correo electrónico inválido');
                if (field.required) {
                    validator = validator.min(1, reqMessage);
                } else {
                    validator = validator.optional().or(z.literal(''));
                }
                if (field.min !== undefined) validator = validator.min(field.min, `Mínimo ${field.min} caracteres`);
                if (field.max !== undefined) validator = validator.max(field.max, `Máximo ${field.max} caracteres`);
                if (field.pattern) validator = validator.regex(field.pattern, field.patternMessage || 'Formato inválido');
            }

            shape[field.name] = validator;
        });

        return z.object(shape);
    }, [allFields]);

    const defaultValues = useMemo(() => {
        const defaults: Record<string, any> = {};
        allFields.forEach(f => {
            if (f.defaultValue !== undefined) {
                defaults[f.name] = f.defaultValue;
            } else {
                const isArrayType = ['multiselect', 'tags', 'file', 'cascader'].includes(f.type);
                const isBoolType = ['checkbox', 'switch'].includes(f.type);
                const isRoleFlagsType = f.type === 'role-flags';
                defaults[f.name] = isRoleFlagsType
                    ? (f.defaultValue ?? DEFAULT_LEGACY_ROLE_FLAGS)
                    : isBoolType
                      ? false
                      : isArrayType
                        ? []
                        : f.type === 'date'
                          ? null
                          : '';
            }
        });
        return defaults;
    }, [allFields]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues,
        mode: 'onTouched'
    });

    const renderInput = (field: DynamicFormField, props: any) => {
        const { onChange, value } = props.field;

        switch (field.type) {
            case 'textarea':
                return <Textarea
                    placeholder={field.placeholder}
                    className="transition-all duration-200 focus:shadow-gold focus:border-[var(--primary)]"
                    {...props.field}
                />;
            case 'password':
                return <Password placeholder={field.placeholder} {...props.field} feedback={false} className="w-full" />;
            case 'number':
                return <InputText type="number" placeholder={field.placeholder} {...props.field} className="w-full" />;
            case 'number-field':
                return (
                    <NumberField
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(val) => onChange(val)}
                        min={field.min}
                        max={field.max}
                        className="w-full"
                    />
                );
            case 'phone':
                return (
                    <PhoneInput
                        value={value ?? ''}
                        onChange={onChange}
                        placeholder={field.placeholder}
                        className="w-full"
                    />
                );
            case 'cascader':
                return (
                    <Cascader
                        options={field.cascaderOptions ?? []}
                        value={Array.isArray(value) ? value : []}
                        onChange={(path) => onChange(path)}
                        placeholder={field.placeholder || 'Seleccionar…'}
                        className="w-full"
                    />
                );
            case 'currency':
                return (
                    <CurrencyInput
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(val) => onChange(val)}
                        className="w-full"
                    />
                );
            case 'select':
                return (
                    <Dropdown
                        options={field.options ?? []}
                        placeholder={field.placeholder || "Selecciona..."}
                        value={value}
                        onChange={(e) => onChange(e.value)}
                        className="w-full border-[var(--border)] focus:border-[var(--primary)]"
                    />
                );
            case 'multiselect':
                return (
                    <MultiSelect
                        options={field.options ?? []}
                        placeholder={field.placeholder || "Múltiples opciones..."}
                        value={value}
                        onChange={(e) => onChange(e.value)}
                        className="w-full"
                        display="chip"
                    />
                );
            case 'checkbox':
                return (
                    <div className="flex items-center gap-[var(--spacing-md)] p-[var(--spacing-sm)] rounded-md hover:bg-[var(--background-secondary)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border)]">
                        <Checkbox checked={value} onChange={(checked) => onChange(checked)} id={field.name} />
                        <label htmlFor={field.name} className="text-sm font-medium leading-none cursor-pointer text-[var(--foreground)]">{field.placeholder || field.label}</label>
                    </div>
                );
            case 'switch':
                return (
                    <div className="flex items-center justify-between gap-[var(--spacing-md)] p-[var(--spacing-md)] rounded-lg bg-[var(--background-secondary)]/50 border border-[var(--border)] group hover:border-[var(--primary)]/30 transition-all">
                        <label htmlFor={field.name} className="text-sm font-medium cursor-pointer text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{field.placeholder || field.label}</label>
                        <Switch checked={value} onCheckedChange={onChange} id={field.name} />
                    </div>
                );
            case 'file':
                return <FileUpload value={value} onChange={onChange} dropzoneText={field.placeholder} className="mt-[var(--spacing-xs)]" />;
            case 'richtext':
                return (
                    <div className="rounded-md border border-[var(--border)] overflow-hidden">
                        <MarkdownEditorWysiwyg
                            value={value ?? ''}
                            onChange={onChange}
                            placeholder={field.placeholder}
                            minHeight="240px"
                        />
                    </div>
                );
            case 'html-richtext':
                return (
                    <div className="rounded-md border border-[var(--border)] overflow-hidden">
                        <RichTextEditor value={value} onChange={(htmlValue) => onChange(htmlValue)} placeholder={field.placeholder} />
                    </div>
                );
            case 'tags':
                return <TagInput value={value} onChange={(e) => onChange(e.value)} placeholder={field.placeholder} className="w-full" />;
            case 'color':
                return (
                    <div className="flex items-center gap-[var(--spacing-md)]">
                        <div className="p-[var(--spacing-xs)] border border-[var(--border)] rounded-md bg-[var(--background-secondary)] shadow-sm">
                            <ColorPicker
                                value={value}
                                onChange={onChange}
                            />
                        </div>
                        <span className="text-sm font-mono text-[var(--foreground-muted)] uppercase">{value || '#000000'}</span>
                    </div>
                );
            case 'rating':
                return <Rating value={value} onChange={(e) => onChange(e.value)} stars={field.max || 5} cancel={false} className="mt-[var(--spacing-sm)]" />;
            case 'date':
                return (
                    <Calendar
                        value={value}
                        onChange={(e: any) => onChange(e.value)}
                        placeholder={field.placeholder || "Selecciona una fecha"}
                        className="w-full"
                    />
                );
            case 'role-flags':
                return (
                    <RoleFlagsGroup
                        value={value ?? DEFAULT_LEGACY_ROLE_FLAGS}
                        onChange={onChange}
                        name={field.name}
                        layout="stacked"
                    />
                );
            case 'text':
            case 'email':
            default:
                return (
                    <InputText
                        type={field.type}
                        placeholder={field.placeholder}
                        {...props.field}
                        className="w-full transition-all duration-200 focus:shadow-gold focus:border-[var(--primary)]"
                    />
                );
        }
    };

    const renderField = (field: DynamicFormField, index: number) => {
        // Lógica de espaciado inteligente:
        // Si es un Switch o Checkbox, y no es el primer elemento, añadimos un pequeño margin extra top
        // para que no se pegue al input de arriba.
        const isInteractive = ['switch', 'checkbox', 'color', 'rating', 'role-flags'].includes(field.type);
        const needsExtraSpace = index > 0 && isInteractive;

        return (
            <div
                key={field.name}
                className={cn(
                    "col-span-12",
                    field.colSpan ? colSpanResolver[field.colSpan] : "col-span-12",
                    needsExtraSpace && "mt-[var(--spacing-sm)]",
                    field.className
                )}
            >
                <FormField
                    control={form.control}
                    name={field.name}
                    render={(fieldProps) => (
                        <FormItem className="space-y-[var(--spacing-sm)] animate-in fade-in slide-in-from-bottom-[var(--spacing-sm)] duration-300">
                            {!['checkbox', 'switch', 'role-flags'].includes(field.type) && (
                                <FormLabel className="font-bold text-[13px] tracking-tight text-[var(--foreground-muted)] uppercase mb-[var(--spacing-sm)] block">
                                    {field.label} {field.required && <span className="text-[var(--destructive)]">*</span>}
                                </FormLabel>
                            )}
                            <FormControl>
                                {renderInput(field, fieldProps)}
                            </FormControl>
                            {field.description && <FormDescription className="text-[12px] opacity-70 mt-[var(--spacing-xs)]">{field.description}</FormDescription>}
                            <FormMessage className="text-[12px] font-medium mt-[var(--spacing-xs)]" />
                        </FormItem>
                    )}
                />
            </div>
        );
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn(
                    "w-full space-y-[var(--spacing-xl)]",
                    variant === 'premium' && "p-[var(--spacing-xs)] rounded-xl bg-gradient-to-b from-[var(--border)] via-transparent to-transparent",
                    variant === 'glass' && "backdrop-blur-md bg-[var(--background)]/40 border border-[var(--border)] p-[var(--spacing-lg)] rounded-2xl shadow-xl",
                    submitting && "pointer-events-none opacity-70",
                    className
                )}
            >
                <div className={cn(
                    "grid grid-cols-12 gap-x-[var(--spacing-lg)] gap-y-7",
                    variant === 'premium' && "bg-[var(--background)] p-[var(--spacing-xl)] rounded-[calc(0.75rem-1px)]"
                )}>
                    {sections.length > 0 ? (
                        sections.map((section, idx) => (
                            <div key={section.id || idx} className="col-span-12 bg-[var(--background)] border border-[var(--border)] rounded-2xl p-[var(--spacing-lg)] md:p-[var(--spacing-xl)] space-y-[var(--spacing-xl)] shadow-sm transition-all hover:shadow-md hover:border-[var(--border-hover,var(--primary))] group/section">
                                {(section.title || section.description) && (
                                    <div className="space-y-[var(--spacing-sm)] border-b border-[var(--border)]/60 pb-[var(--spacing-lg)] mb-[var(--spacing-lg)]">
                                        {section.title && <h3 className="text-lg font-bold tracking-tight text-[var(--foreground)] group-hover/section:text-[var(--primary)] transition-colors">{section.title}</h3>}
                                        {section.description && <p className="text-sm text-[var(--foreground-muted)] font-medium">{section.description}</p>}
                                    </div>
                                )}
                                <div className="grid grid-cols-12 gap-x-[var(--spacing-lg)] gap-y-7">
                                    {section.fields.map((f, i) => renderField(f, i))}
                                </div>
                            </div>
                        ))
                    ) : (
                        fields.map((f, i) => renderField(f, i))
                    )}

                    <div className="col-span-12 flex justify-end items-center gap-[var(--spacing-md)] mt-[var(--spacing-xl)] pt-[var(--spacing-lg)] border-t border-[var(--border)]/60">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={submitting}
                                onClick={onCancel}
                                className="hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] transition-all"
                            >
                                {cancelText || 'Cancelar'}
                            </Button>
                        )}
                        <Button
                            type="submit"
                            loading={submitting}
                            disabled={submitting}
                            className={cn(
                                "min-w-[140px] shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95",
                                submitClassName
                            )}
                        >
                            {submitText}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
};

export default DynamicForm;
