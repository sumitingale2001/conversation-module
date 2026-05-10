import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useConversationStore from "@/store/conversation.store";
import {
  createPage,
  createFallbackSummaryPage,
  getPages,
  patchPage,
} from "./pageApi";
import EmptyState from "./EmptyState";
import PageHeader from "./PageHeader";
import PageTabBar from "./PageTabBar";
import StaleRefreshBanner from "./StaleRefreshBanner";
import TiptapPageEditor from "./editor/TiptapPageEditor";
import ManagePresetModal from "./preset/ManagePresetModal";
import { userId, workspaceId } from "@/utils/conversation.utils";

const buildLocalPage = (payload, position) => ({
  _id: `local-${Date.now()}-${position}`,
  name: payload.name,
  type: payload.type,
  position,
  content: null,
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

  const createAndSelectPage = async (payload) => {
    const localPage = buildLocalPage(payload, pages.length);
    setPages((prev) => [...prev, localPage]);
    setActivePageId(localPage._id);

    const created = await createPage({
      workspaceId,
      conversationId,
      payload,
      userId,
    });
    if (created?._id) {
      setPages((prev) =>
        prev.map((p) => (p._id === localPage._id ? created : p)),
      );
      setActivePageId(created._id);
    }
  };

  const handleRename = (nextName) => {
    if (!activePage) return;
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

  const handleDeletePage = () => {
    if (!activePage || pages.length <= 1) return;
    const nextPages = pages.filter((page) => page._id !== activePage._id);
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

      <div className="flex min-h-0 flex-1 flex-col p-4">
        {activePage.content === null ? (
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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
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
    </div>
  );
};

export default RightPanel;
