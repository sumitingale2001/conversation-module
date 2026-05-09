"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const extractPlainText = (doc) => {
  if (!doc || typeof doc !== "object") return "";
  if (typeof doc.text === "string") return doc.text;
  if (!Array.isArray(doc.content)) return "";
  return doc.content
    .map((node) => extractPlainText(node))
    .join(" ")
    .trim();
};

const TiptapPageEditor = ({ page, onSave, onPlainTextChange }) => {
  const onSaveRef = useRef(onSave);
  const onPlainTextChangeRef = useRef(onPlainTextChange);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onPlainTextChangeRef.current = onPlainTextChange;
  }, [onPlainTextChange]);

  const editor = useEditor({
    extensions: [StarterKit, CharacterCount.configure({})],
    content: page?.content || EMPTY_DOC,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-sm max-w-none px-10 pb-10 focus:outline-none min-h-full",
      },
    },
    onUpdate: ({ editor: instance }) => {
      const json = instance.getJSON();
      onSaveRef.current?.(json);
      onPlainTextChangeRef.current?.(extractPlainText(json));
    },
  });

  return (
    <div className="relative flex-1 overflow-y-auto bg-white pt-10">
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapPageEditor;
