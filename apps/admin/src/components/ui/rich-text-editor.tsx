'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Heading3, Strikethrough } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Enter content...',
    className = ''
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline',
                },
            }),
        ],
        content: value,
        onUpdate: ({ editor }: { editor: any }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-2',
            },
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className={cn('border rounded-md bg-white', className)}>
            {/* Toolbar */}
            <div className="border-b p-2 flex flex-wrap gap-1">
                <Button
                    type="button"
                    variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className="h-8 w-8 p-0"
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className="h-8 w-8 p-0"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className="h-8 w-8 p-0"
                >
                    <Heading3 className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                    type="button"
                    variant={editor.isActive('bold') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className="h-8 w-8 p-0"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('italic') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className="h-8 w-8 p-0"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('strike') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className="h-8 w-8 p-0"
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                    type="button"
                    variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className="h-8 w-8 p-0"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className="h-8 w-8 p-0"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                    type="button"
                    variant={editor.isActive('link') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                        const url = window.prompt('Enter URL:');
                        if (url) {
                            editor.chain().focus().setLink({ href: url }).run();
                        }
                    }}
                    className="h-8 w-8 p-0"
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>
            </div>

            {/* Editor */}
            <div className="relative">
                <EditorContent
                    editor={editor}
                    className="min-h-[200px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:prose [&_.ProseMirror]:max-w-none"
                />
            </div>
        </div>
    );
}
