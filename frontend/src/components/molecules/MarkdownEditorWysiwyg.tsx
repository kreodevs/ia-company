import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
    BlockTypeSelect,
    BoldItalicUnderlineToggles,
    CodeToggle,
    CreateLink,
    DiffSourceToggleWrapper,
    InsertCodeBlock,
    InsertImage,
    InsertTable,
    InsertThematicBreak,
    ListsToggle,
    MDXEditor,
    Separator,
    StrikeThroughSupSubToggles,
    UndoRedo,
    codeBlockPlugin,
    codeMirrorPlugin,
    diffSourcePlugin,
    headingsPlugin,
    imagePlugin,
    linkDialogPlugin,
    linkPlugin,
    listsPlugin,
    markdownShortcutPlugin,
    quotePlugin,
    tablePlugin,
    thematicBreakPlugin,
    toolbarPlugin,
    type MDXEditorMethods,
    type RealmPlugin,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import './markdownEditorWysiwygTheme.css';
import { cn } from '@/lib/utils';

const CONTENT_CLASS = cn(
    'prose prose-sm max-w-none dark:prose-invert',
    'prose-headings:font-bold prose-headings:text-[var(--foreground)]',
    'prose-p:text-[var(--foreground)] prose-a:text-[var(--primary)]',
    'prose-code:text-[var(--accent)]',
);

const CODE_LANGUAGES = {
    js: 'JavaScript',
    ts: 'TypeScript',
    tsx: 'TSX',
    css: 'CSS',
    html: 'HTML',
    json: 'JSON',
    mermaid: 'Mermaid',
    txt: 'Text',
} as const;

function KreoMarkdownToolbar({ showSourceView = false }: { showSourceView?: boolean }) {
    const toolbar = (
        <>
            <UndoRedo />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <BoldItalicUnderlineToggles />
            <StrikeThroughSupSubToggles />
            <CodeToggle />
            <Separator />
            <ListsToggle />
            <CreateLink />
            <InsertImage />
            <InsertTable />
            <InsertThematicBreak />
            <InsertCodeBlock />
        </>
    );

    if (showSourceView) {
        return <DiffSourceToggleWrapper>{toolbar}</DiffSourceToggleWrapper>;
    }

    return toolbar;
}

function createPlugins(options: {
    onImageUpload?: (file: File) => Promise<string>;
    showSourceView?: boolean;
    diffMarkdown?: string;
}): RealmPlugin[] {
    const plugins: RealmPlugin[] = [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin(
            options.onImageUpload
                ? {
                      imageUploadHandler: (file: File) => options.onImageUpload!(file),
                  }
                : undefined,
        ),
        tablePlugin(),
        thematicBreakPlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
        codeMirrorPlugin({ codeBlockLanguages: CODE_LANGUAGES }),
        markdownShortcutPlugin(),
        toolbarPlugin({
            toolbarClassName: 'kreo-mdx-editor__toolbar',
            toolbarContents: () => <KreoMarkdownToolbar showSourceView={options.showSourceView} />,
        }),
    ];

    if (options.showSourceView) {
        plugins.push(
            diffSourcePlugin({
                viewMode: 'rich-text',
                diffMarkdown: options.diffMarkdown ?? '',
            }),
        );
    }

    return plugins;
}

export interface MarkdownEditorWysiwygProps {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    className?: string;
    placeholder?: string;
    minHeight?: string;
    onImageUpload?: (file: File) => Promise<string>;
    showSourceView?: boolean;
    diffMarkdown?: string;
}

export type MarkdownEditorWysiwygRef = MDXEditorMethods;

export const MarkdownEditorWysiwyg = forwardRef<MarkdownEditorWysiwygRef, MarkdownEditorWysiwygProps>(
    (
        {
            value,
            onChange,
            readOnly = false,
            className,
            placeholder = 'Escribe contenido…',
            minHeight = '320px',
            onImageUpload,
            showSourceView = false,
            diffMarkdown,
        },
        ref,
    ) => {
        const editorRef = useRef<MDXEditorMethods>(null);
        const lastEmittedRef = useRef(value);

        useImperativeHandle(ref, () => editorRef.current as MDXEditorMethods);

        const plugins = useMemo(
            () =>
                createPlugins({
                    onImageUpload,
                    showSourceView,
                    diffMarkdown,
                }),
            [onImageUpload, showSourceView, diffMarkdown],
        );

        useEffect(() => {
            if (!editorRef.current || value === lastEmittedRef.current) return;
            editorRef.current.setMarkdown(value);
            lastEmittedRef.current = value;
        }, [value]);

        const handleChange = (markdown: string) => {
            lastEmittedRef.current = markdown;
            onChange?.(markdown);
        };

        return (
            <div
                className={cn('w-full', className)}
                style={{ ['--kreo-mdx-min-height' as string]: minHeight }}
            >
                <MDXEditor
                    ref={editorRef}
                    markdown={value}
                    onChange={handleChange}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    plugins={plugins}
                    spellCheck
                    className={cn(
                        'kreo-mdx-editor dark-theme',
                        readOnly && 'kreo-mdx-editor--readonly',
                    )}
                    contentEditableClassName={CONTENT_CLASS}
                />
            </div>
        );
    },
);

MarkdownEditorWysiwyg.displayName = 'MarkdownEditorWysiwyg';
