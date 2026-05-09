const downloadText = (filename, text) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const EditorBubbleMenu = ({ editor }) => {
  if (!editor) return null;
  const words = editor.storage.characterCount?.words?.() || 0;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow">
      <span className="text-xs text-gray-500">{words} words</span>
      <button
        type="button"
        className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
      >
        T
      </button>
      <button
        type="button"
        onClick={() => downloadText("page-export.txt", editor.getText())}
        className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
      >
        Export
      </button>
    </div>
  );
};

export default EditorBubbleMenu;
