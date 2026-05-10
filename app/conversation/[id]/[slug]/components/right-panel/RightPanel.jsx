import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useConversationStore from "@/store/conversation.store";
import {
  createPage,
  createFallbackSummaryPage,
  createPreset,
  deletePage,
  getPages,
  patchPage,
} from "./pageApi";
import EmptyState from "./EmptyState";
import PageHeader from "./PageHeader";
import PageTabBar from "./PageTabBar";
import StaleRefreshBanner from "./StaleRefreshBanner";
import TiptapPageEditor from "./editor/TiptapPageEditor";
import ManagePresetModal from "./preset/ManagePresetModal";
import PresetFormModal from "./preset/PresetFormModal";
import { userId, workspaceId } from "@/utils/conversation.utils";

const buildLocalPage = (payload, position) => ({
  _id: `local-${Date.now()}-${position}`,
  name: payload.name,
  type: payload.type,
  position,
  content: payload.type === "custom" ? "" : null,
  presetId: payload.presetId || null,
  isStale: false,
  generatedAt: null,
  canvasLinks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const RightPanel = () => {
  const conversation = useConversationStore((state) => state.conversation);
  const conversationId = conversation?._id;

  const [pages, setPages] = useState([createFallbackSummaryPage()]);
  const [activePageId, setActivePageId] = useState("local-summary");
  const [plainText, setPlainText] = useState("");
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [createPresetOpen, setCreatePresetOpen] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const incomingPages = await getPages({ workspaceId, conversationId });
      if (ignore) return;
      setPages(incomingPages);
      setActivePageId((prev) => prev || incomingPages[0]?._id);
    })();
    return () => {
      ignore = true;
    };
  }, [workspaceId, conversationId]);

  const activePage = useMemo(
    () => pages.find((page) => page._id === activePageId) || pages[0] || null,
    [pages, activePageId],
  );

  const persistPage = useCallback(
    (pageId, payload) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        patchPage({ workspaceId, conversationId, pageId, payload });
      }, 800);
    },
    [workspaceId, conversationId],
  );

  const createAndSelectPage = async (payload, { prepend = false } = {}) => {
    let localPage;
    let apiPosition = 0;

    setPages((prev) => {
      apiPosition = prepend ? 0 : prev.length;
      localPage = buildLocalPage(payload, apiPosition);
      return prepend ? [localPage, ...prev] : [...prev, localPage];
    });

    setActivePageId(localPage._id);

    const created = await createPage({
      workspaceId,
      conversationId,
      payload: { ...payload, position: apiPosition },
      userId,
    });
    if (created?._id) {
      setPages((prev) =>
        prev.map((p) => (p._id === localPage._id ? created : p)),
      );
      setActivePageId(created._id);
    }
  };

  const handleCreateSummaryPage = () => {
    const summaryCount = pages.filter((p) => p.type === "summary").length;
    const name =
      summaryCount === 0 ? "Summary" : `Summary (${summaryCount + 1})`;
    createAndSelectPage(
      { name, type: "summary", content: null },
      { prepend: true },
    );
  };

  const handleRename = (nextName) => {
    if (!activePage) return;
    if (
      activePage.type === "summary" ||
      activePage._id === "local-summary"
    ) {
      return;
    }
    setPages((prev) =>
      prev.map((page) =>
        page._id === activePage._id
          ? { ...page, name: nextName, updatedAt: new Date().toISOString() }
          : page,
      ),
    );
    persistPage(activePage._id, { name: nextName });
  };

  const handleEditorSave = (nextContent) => {
    if (!activePage) return;
    setPages((prev) =>
      prev.map((page) =>
        page._id === activePage._id
          ? {
              ...page,
              content: nextContent,
              updatedAt: new Date().toISOString(),
            }
          : page,
      ),
    );
    persistPage(activePage._id, { content: nextContent });
  };

  const handleDeletePage = async () => {
    if (!activePage || pages.length <= 1) return;
    const pageId = activePage._id;
    const isLocalOnly = String(pageId).startsWith("local-");
    if (workspaceId && conversationId && !isLocalOnly) {
      const ok = await deletePage({ workspaceId, conversationId, pageId });
      if (!ok) return;
    }
    const nextPages = pages.filter((page) => page._id !== pageId);
    setPages(nextPages);
    setActivePageId(nextPages[0]?._id || "");
  };

  if (!activePage) return null;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <PageTabBar
        pages={pages}
        activePageId={activePage._id}
        onTabClick={setActivePageId}
        onCreateCustomPage={() =>
          createAndSelectPage({
            name: "New page",
            type: "custom",
            content: null,
          })
        }
        onCreatePreset={() => setCreatePresetOpen(true)}
        onCreateSummaryPage={handleCreateSummaryPage}
        onCreateFromPreset={(preset) =>
          createAndSelectPage({
            name: preset.name,
            type: "preset",
            presetId: preset._id,
            content: null,
          })
        }
        onOpenManagePresets={() => setManagePresetsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col px-4">
        {activePage.content === null && activePage.type !== "custom" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <PageHeader
              page={activePage}
              editorText={plainText}
              onRename={handleRename}
              onDelete={handleDeletePage}
              onLinkCanvas={() => {}}
              onOpenManagePresets={() => setManagePresetsOpen(true)}
            />
            <EmptyState pageName={activePage.name} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <PageHeader
              page={activePage}
              editorText={plainText}
              onRename={handleRename}
              onDelete={handleDeletePage}
              onLinkCanvas={() => {}}
              onOpenManagePresets={() => setManagePresetsOpen(true)}
            />
            {activePage.isStale && <StaleRefreshBanner />}
            <TiptapPageEditor
              key={activePage._id}
              page={activePage}
              onSave={handleEditorSave}
              onPlainTextChange={setPlainText}
            />
          </div>
        )}
      </div>

      <ManagePresetModal
        open={managePresetsOpen}
        workspaceId={workspaceId}
        onClose={() => setManagePresetsOpen(false)}
      />

      <PresetFormModal
        open={createPresetOpen}
        mode="create"
        onClose={() => setCreatePresetOpen(false)}
        onSubmit={async (payload) => {
          await createPreset({ workspaceId, payload });
          setCreatePresetOpen(false);
        }}
      />
    </div>
  );
};

export default RightPanel;
