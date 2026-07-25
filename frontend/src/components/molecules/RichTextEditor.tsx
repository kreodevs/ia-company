import { forwardRef } from "react";
import ReactQuill from "react-quill";
import { cn } from "@/lib/utils";
import "react-quill/dist/quill.snow.css";

/**
 * Editor WYSIWYG basado en Quill que emite **HTML**.
 *
 * @deprecated Usa {@link MarkdownEditorWysiwyg} para contenido markdown (CMS, emails).
 * Mantén este componente solo para integraciones legacy que persisten HTML.
 */
export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
}

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "blockquote",
  "code-block",
  "indent",
  "align",
  "link",
  "image",
];

export const RichTextEditor = forwardRef<ReactQuill, RichTextEditorProps>(
  ({ className, error, label, value, onChange, placeholder }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium leading-none text-[var(--foreground)]">
            {label}
          </label>
        )}
        <div
          className={cn(
            "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] overflow-hidden",
            error && "border-[var(--destructive)]",
            className,
          )}
        >
          <ReactQuill
            ref={ref}
            value={value ?? ""}
            onChange={onChange}
            placeholder={placeholder}
            modules={modules}
            formats={formats}
            theme="snow"
          />
        </div>
        {error && (
          <span className="text-[14px] text-[var(--destructive)] font-medium">{error}</span>
        )}
      </div>
    );
  },
);
RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
