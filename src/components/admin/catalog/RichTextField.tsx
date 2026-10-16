"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-semibold ${active ? "bg-ink text-white" : "text-ink hover:bg-page"}`}
    >
      {children}
    </button>
  );
}

export function RichTextField({
  label,
  value,
  onChange,
  minHeight = "min-h-28",
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
}) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${minHeight} px-3 py-2 text-sm text-ink outline-none prose-sm max-w-none [&_a]:text-primary [&_a]:underline`,
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  function toggleSource() {
    if (!sourceMode) {
      setSourceDraft(editor?.getHTML() ?? value);
      setSourceMode(true);
      return;
    }
    editor?.commands.setContent(sourceDraft || "<p></p>");
    onChange(sourceDraft);
    setSourceMode(false);
  }

  function setLink() {
    if (!editor) {
      return;
    }
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) {
      return;
    }
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="block text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <div className="mt-1 overflow-hidden rounded-md border border-black/10 bg-card">
        {editor ? (
          <div className="flex flex-wrap items-center gap-1 border-b border-black/5 px-2 py-1">
            <ToolButton
              title="Heading 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H2
            </ToolButton>
            <ToolButton
              title="Heading 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              H3
            </ToolButton>
            <span className="mx-1 h-4 w-px bg-black/10" />
            <ToolButton
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              Bold
            </ToolButton>
            <ToolButton
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              Italic
            </ToolButton>
            <ToolButton
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              Underline
            </ToolButton>
            <ToolButton
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              Strike
            </ToolButton>
            <span className="mx-1 h-4 w-px bg-black/10" />
            <ToolButton
              title="Bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              List
            </ToolButton>
            <ToolButton
              title="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              Numbered
            </ToolButton>
            <ToolButton
              title="Quote"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              Quote
            </ToolButton>
            <span className="mx-1 h-4 w-px bg-black/10" />
            <ToolButton
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              Left
            </ToolButton>
            <ToolButton
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              Center
            </ToolButton>
            <ToolButton
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              Right
            </ToolButton>
            <span className="mx-1 h-4 w-px bg-black/10" />
            <ToolButton title="Link" active={editor.isActive("link")} onClick={setLink}>
              Link
            </ToolButton>
            <button
              type="button"
              title="Edit raw HTML"
              onClick={toggleSource}
              className={`ml-auto rounded px-2 py-1 text-xs font-semibold ${sourceMode ? "bg-ink text-white" : "text-ink hover:bg-page"}`}
            >
              {sourceMode ? "Visual" : "HTML"}
            </button>
          </div>
        ) : null}
        {sourceMode ? (
          <textarea
            value={sourceDraft}
            onChange={(event) => setSourceDraft(event.target.value)}
            spellCheck={false}
            className={`${minHeight} w-full px-3 py-2 font-mono text-xs text-ink outline-none`}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </div>
  );
}
