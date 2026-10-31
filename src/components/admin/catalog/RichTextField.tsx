"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { uploadCatalogImageAction } from "@/app/(admin)/admin/catalog-actions";
import { uploadAdminImage } from "@/components/admin/common/uploadAdminImage";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useToastStore } from "@/store/toast";
import type { ActionResult } from "@/server/admin/result";

function ToolButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-ink text-white"
          : "text-ink/70 hover:bg-black/5 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function ToolDivider() {
  return <span className="mx-1 h-5 w-px bg-black/10" aria-hidden />;
}

export function RichTextField({
  label,
  value,
  onChange,
  minHeight = "min-h-28",
  uploadAction = uploadCatalogImageAction,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
  uploadAction?: (formData: FormData) => Promise<ActionResult>;
}) {
  const push = useToastStore((state) => state.push);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ HTMLAttributes: { class: "rounded-md" } }),
      Placeholder.configure({ placeholder: "Write a compelling, clear description..." }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${minHeight} px-3 py-2 text-sm text-ink outline-none prose-sm max-w-none [&_a]:text-primary [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]`,
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

  function openLinkDialog() {
    if (!editor) {
      return;
    }
    const previous = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(previous ?? "https://");
    setLinkDialogOpen(true);
  }

  function applyLink() {
    if (!editor) {
      return;
    }
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkDialogOpen(false);
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: linkUrl.trim() })
      .run();
    setLinkDialogOpen(false);
  }

  async function insertImage(files: FileList | null) {
    if (!editor || !files || files.length === 0) {
      return;
    }
    const file = files[0];
    setUploading(true);
    const result = await uploadAdminImage(file, uploadAction);
    setUploading(false);
    if (!result.ok || !result.url) {
      push({ message: result.message, type: "error" });
      return;
    }
    editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
  }

  return (
    <div className="block text-sm">
      <span className="font-semibold text-ink">{label}</span>
      <div className="mt-1 overflow-hidden rounded-md border border-black/10 bg-card focus-within:border-primary">
        {editor ? (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-black/5 bg-page/60 px-2 py-1.5">
            <ToolButton
              title="Undo"
              disabled={!editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo2 size={15} />
            </ToolButton>
            <ToolButton
              title="Redo"
              disabled={!editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo2 size={15} />
            </ToolButton>
            <ToolDivider />
            <ToolButton
              title="Heading 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 size={16} />
            </ToolButton>
            <ToolButton
              title="Heading 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 size={16} />
            </ToolButton>
            <ToolDivider />
            <ToolButton
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={15} />
            </ToolButton>
            <ToolButton
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={15} />
            </ToolButton>
            <ToolButton
              title="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={15} />
            </ToolButton>
            <ToolButton
              title="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={15} />
            </ToolButton>
            <ToolDivider />
            <ToolButton
              title="Bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={15} />
            </ToolButton>
            <ToolButton
              title="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={15} />
            </ToolButton>
            <ToolButton
              title="Quote"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote size={15} />
            </ToolButton>
            <ToolDivider />
            <ToolButton
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft size={15} />
            </ToolButton>
            <ToolButton
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter size={15} />
            </ToolButton>
            <ToolButton
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight size={15} />
            </ToolButton>
            <ToolDivider />
            <ToolButton
              title="Link"
              active={editor.isActive("link")}
              onClick={openLinkDialog}
            >
              <Link2 size={15} />
            </ToolButton>
            <ToolButton
              title="Insert image"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ImagePlus size={15} />
              )}
            </ToolButton>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                void insertImage(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              title="Edit raw HTML"
              aria-pressed={sourceMode}
              onClick={toggleSource}
              className={`ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors ${sourceMode ? "bg-ink text-white" : "text-ink/70 hover:bg-black/5 hover:text-ink"}`}
            >
              <Code2 size={14} />
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
      <Dialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        title="Link URL"
        closeLabel="Close"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyLink}>Apply</Button>
          </>
        }
      >
        <Input
          label="URL"
          hideLabel
          autoFocus
          value={linkUrl}
          placeholder="https://"
          onChange={(event) => setLinkUrl(event.target.value)}
        />
      </Dialog>
    </div>
  );
}
