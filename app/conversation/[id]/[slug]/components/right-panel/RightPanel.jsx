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
import LinkToCanvasModal from "./LinkToCanvasModal";
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

function mergePagesFromServer(prev, incoming) {
  const map = new Map();
  for (const p of incoming) {
    map.set(String(p._id), p);
  }

  const hasRealSummary = [...map.values()].some(
    (x) => x.type === "summary" && String(x._id) !== "local-summary",
  );

  for (const p of prev) {
    const id = String(p._id);
    if (id === "local-summary" && hasRealSummary) continue;
    if (!map.has(id)) map.set(id, p);
  }

  return Array.from(map.values()).sort(
    (a, b) => (Number(a.position) ?? 0) - (Number(b.position) ?? 0),
  );
}

const RightPanel = () => {
  const conversation = useConversationStore((state) => state.conversation);
  const conversationId = conversation?._id;

  // ✅ Single state object so pages and activePageId are ALWAYS updated
  // together in one setState call — eliminating any render where they
  // can be out of sync with each other.
  const [state, setState] = useState({
    pages: [createFallbackSummaryPage()],
    activePageId: "local-summary",
  });

  const { pages, activePageId } = state;

  const [plainText, setPlainText] = useState("");
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);
  const [createPresetOpen, setCreatePresetOpen] = useState(false);
  const [linkCanvasOpen, setLinkCanvasOpen] = useState(false);
  const saveTimeoutRef = useRef(null);

  const setPages = useCallback((updater) => {
    setState((prev) => ({
      ...prev,
      pages: typeof updater === "function" ? updater(prev.pages) : updater,
    }));
  }, []);

  const setActivePageId = useCallback((activePageId) => {
    setState((prev) => ({ ...prev, activePageId }));
  }, []);

  const setPageState = useCallback((pages, activePageId) => {
    setState({ pages, activePageId });
  }, []);

  const selectPageTab = useCallback((pageId) => {
    setState((prev) => ({ ...prev, activePageId: pageId }));
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const incomingPages = await getPages({ workspaceId, conversationId });
      if (ignore) return;

      setState((prev) => {
        const merged = mergePagesFromServer(prev.pages, incomingPages);
        const intent = prev.activePageId;

        const intentExistsInMerged = merged.some(
          (p) => String(p._id) === String(intent),
        );
        const isLocalIntent = String(intent).startsWith("local-");
        const shouldKeepIntent = intentExistsInMerged || isLocalIntent;
        const nextActiveId = shouldKeepIntent ? intent : (merged[0]?._id ?? "");

        return { pages: merged, activePageId: nextActiveId };
      });
    })();
    return () => {
      ignore = true;
    };
  }, [workspaceId, conversationId]);

  const activePage = useMemo(
    () => pages.find((page) => page._id === activePageId) ?? null,
    [pages, activePageId],
  );

  const existingCanvasLinks = useMemo(() => {
    const raw = activePage?.canvasLinks;
    return Array.isArray(raw) ? raw.map(String) : [];
  }, [activePage]);

  const refreshPagesFromServer = useCallback(async () => {
    if (!workspaceId || !conversationId) return;
    const incomingPages = await getPages({ workspaceId, conversationId });
    setState((prev) => ({
      pages: mergePagesFromServer(prev.pages, incomingPages),
      activePageId: prev.activePageId,
    }));
  }, [workspaceId, conversationId]);

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

    // ✅ pages and activePageId updated atomically in one setState
    setState((prev) => {
      apiPosition = prepend ? 0 : prev.pages.length;
      localPage = buildLocalPage(payload, apiPosition);
      const nextPages = prepend
        ? [localPage, ...prev.pages]
        : [...prev.pages, localPage];
      return { pages: nextPages, activePageId: localPage._id };
    });

    const created = await createPage({
      workspaceId,
      conversationId,
      payload: { ...payload, position: apiPosition },
      userId,
    });

    if (created?._id) {
      // ✅ Swap local → real page and update activePageId atomically
      setState((prev) => ({
        pages: prev.pages.map((p) => (p._id === localPage._id ? created : p)),
        activePageId: created._id,
      }));
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
    if (activePage.type === "summary" || activePage._id === "local-summary") {
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
    setState((prev) => {
      const nextPages = prev.pages.filter((page) => page._id !== pageId);
      const fallback = nextPages[0]?._id || "";
      return { pages: nextPages, activePageId: fallback };
    });
  };

  const tabBarProps = {
    pages,
    activePageId: activePage?._id ?? activePageId,
    onTabClick: selectPageTab,
    onCreateCustomPage: () =>
      createAndSelectPage({ name: "New page", type: "custom", content: null }),
    onCreatePreset: () => setCreatePresetOpen(true),
    onCreateSummaryPage: handleCreateSummaryPage,
    onCreateFromPreset: (preset) =>
      createAndSelectPage({
        name: preset.name,
        type: "preset",
        presetId: preset._id,
        content: null,
      }),
    onOpenManagePresets: () => setManagePresetsOpen(true),
  };

  if (!activePage) {
    return (
      <div className="flex h-full flex-col bg-gray-50">
        <PageTabBar {...tabBarProps} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <PageTabBar {...tabBarProps} />

      <div className="flex min-h-0 flex-1 flex-col px-4">
        {activePage.content === null && activePage.type !== "custom" ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <PageHeader
              page={activePage}
              editorText={plainText}
              onRename={handleRename}
              onDelete={handleDeletePage}
              onLinkCanvas={() => setLinkCanvasOpen(true)}
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
              onLinkCanvas={() => setLinkCanvasOpen(true)}
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

      {activePage && workspaceId && conversationId ? (
        <LinkToCanvasModal
          open={linkCanvasOpen}
          onClose={() => setLinkCanvasOpen(false)}
          onSuccess={refreshPagesFromServer}
          workspaceId={workspaceId}
          conversationId={conversationId}
          pageId={String(activePage._id)}
          pageName={activePage.name}
          existingCanvasLinks={existingCanvasLinks}
        />
      ) : null}
    </div>
  );
};

export default RightPanel;
