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

/** Stable string id for tab selection and merges (API may use `id`, BSON `$oid`, etc.). */
function pageIdStr(pageOrId) {
  if (pageOrId == null) return "";
  if (typeof pageOrId === "string" || typeof pageOrId === "number") {
    return String(pageOrId);
  }
  if (typeof pageOrId === "object") {
    const raw = pageOrId._id ?? pageOrId.id;
    if (raw != null && typeof raw === "object" && raw.$oid != null) {
      return String(raw.$oid);
    }
    if (raw != null) return String(raw);
    if (pageOrId.$oid != null) return String(pageOrId.$oid);
  }
  return "";
}

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

/** Server returned at least one persisted page (not only the client fallback summary). */
function incomingHasPersistedPages(incoming) {
  return incoming.some((p) => {
    const id = pageIdStr(p);
    return id && id !== "local-summary" && !id.startsWith("local-");
  });
}

/** Drop optimistic `local-*` row when the server list already has the same page (race-safe). */
function isStaleLocalReplacedByServer(localPage, incoming) {
  const id = pageIdStr(localPage);
  if (!id.startsWith("local-") || id === "local-summary") return false;
  if (!incomingHasPersistedPages(incoming)) return false;
  const pos = Number(localPage.position) ?? 0;
  const typ = localPage.type;
  const name = localPage.name;
  const preset = localPage.presetId ?? null;
  return incoming.some((q) => {
    const qid = pageIdStr(q);
    if (!qid || qid.startsWith("local-")) return false;
    if (q.type !== typ || q.name !== name) return false;
    if ((Number(q.position) ?? 0) !== pos) return false;
    if (preset != null && String(q.presetId ?? "") !== String(preset))
      return false;
    return true;
  });
}

function mergePagesFromServer(prev, incoming) {
  const map = new Map();
  for (const p of incoming) {
    const k = pageIdStr(p);
    if (!k) continue;
    map.set(k, { ...p, _id: k });
  }

  const hasRealSummary = [...map.values()].some(
    (x) => x.type === "summary" && pageIdStr(x) !== "local-summary",
  );

  for (const p of prev) {
    const id = pageIdStr(p);
    if (!id) continue;
    if (id === "local-summary" && hasRealSummary) continue;
    if (isStaleLocalReplacedByServer(p, incoming)) continue;
    if (!map.has(id)) map.set(id, { ...p, _id: id });
  }

  return Array.from(map.values()).sort(
    (a, b) => (Number(a.position) ?? 0) - (Number(b.position) ?? 0),
  );
}

const RightPanel = () => {
  const conversation = useConversationStore((state) => state.conversation);
  const conversationIdStr =
    conversation?._id === undefined || conversation?._id === null
      ? ""
      : String(conversation._id);

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
    setState((prev) => ({ ...prev, activePageId: pageIdStr(pageId) }));
  }, []);

  useEffect(() => {
    if (!workspaceId || !conversationIdStr) return;
    let ignore = false;
    (async () => {
      const incomingPages = await getPages({
        workspaceId,
        conversationId: conversationIdStr,
      });
      if (ignore) return;

      setState((prev) => {
        const merged = mergePagesFromServer(prev.pages, incomingPages);
        const nextActiveId =
          pageIdStr(merged.find((p) => p.type === "summary")) ||
          pageIdStr(merged[0]) ||
          "";

        return { pages: merged, activePageId: nextActiveId };
      });
    })();
    return () => {
      ignore = true;
    };
  }, [workspaceId, conversationIdStr]);

  const activePage = useMemo(
    () =>
      pages.find((page) => pageIdStr(page) === pageIdStr(activePageId)) ??
      null,
    [pages, activePageId],
  );

  const existingCanvasLinks = useMemo(() => {
    const raw = activePage?.canvasLinks;
    return Array.isArray(raw) ? raw.map(String) : [];
  }, [activePage]);

  const refreshPagesFromServer = useCallback(async () => {
    if (!workspaceId || !conversationIdStr) return;
    const incomingPages = await getPages({
      workspaceId,
      conversationId: conversationIdStr,
    });
    setState((prev) => {
      const merged = mergePagesFromServer(prev.pages, incomingPages);
      const intent = pageIdStr(prev.activePageId);
      const still = merged.some((p) => pageIdStr(p) === intent);
      const nextActiveId = still
        ? intent
        : pageIdStr(merged.find((p) => p.type === "summary")) ||
          pageIdStr(merged[0]) ||
          "";
      return { pages: merged, activePageId: nextActiveId };
    });
  }, [workspaceId, conversationIdStr]);

  const persistPage = useCallback(
    (pageId, payload) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        patchPage({
          workspaceId,
          conversationId: conversationIdStr,
          pageId,
          payload,
        });
      }, 800);
    },
    [workspaceId, conversationIdStr],
  );

  const createAndSelectPage = async (payload, { prepend = false } = {}) => {
    if (!workspaceId || !conversationIdStr) return;
    let localPage;
    let apiPosition = 0;

    // ✅ pages and activePageId updated atomically in one setState
    setState((prev) => {
      apiPosition = prepend ? 0 : prev.pages.length;
      localPage = buildLocalPage(payload, apiPosition);
      const nextPages = prepend
        ? [localPage, ...prev.pages]
        : [...prev.pages, localPage];
      return { pages: nextPages, activePageId: pageIdStr(localPage) };
    });

    const created = await createPage({
      workspaceId,
      conversationId: conversationIdStr,
      payload: { ...payload, position: apiPosition },
      userId,
    });

    const cid = pageIdStr(created);
    if (cid) {
      const normalized = { ...created, _id: cid };
      setState((prev) => ({
        pages: prev.pages.map((p) =>
          pageIdStr(p) === pageIdStr(localPage) ? normalized : p,
        ),
        activePageId: cid,
      }));
      // Do not refetch here: merge can run before the swap commit and re-add the
      // optimistic `local-*` row alongside the server page. Swap + effect refetch is enough.
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
    if (activePage.type === "summary" || pageIdStr(activePage) === "local-summary") {
      return;
    }
    setPages((prev) =>
      prev.map((page) =>
        pageIdStr(page) === pageIdStr(activePage)
          ? { ...page, name: nextName, updatedAt: new Date().toISOString() }
          : page,
      ),
    );
    persistPage(pageIdStr(activePage), { name: nextName });
  };

  const handleEditorSave = (nextContent) => {
    if (!activePage) return;
    setPages((prev) =>
      prev.map((page) =>
        pageIdStr(page) === pageIdStr(activePage)
          ? {
              ...page,
              content: nextContent,
              updatedAt: new Date().toISOString(),
            }
          : page,
      ),
    );
    persistPage(pageIdStr(activePage), { content: nextContent });
  };

  const handleDeletePage = async () => {
    if (!activePage || pages.length <= 1) return;
    const pageId = pageIdStr(activePage);
    const isLocalOnly = String(pageId).startsWith("local-");
    if (workspaceId && conversationIdStr && !isLocalOnly) {
      const ok = await deletePage({
        workspaceId,
        conversationId: conversationIdStr,
        pageId,
      });
      if (!ok) return;
    }
    setState((prev) => {
      const nextPages = prev.pages.filter(
        (page) => pageIdStr(page) !== pageIdStr(pageId),
      );
      const deletedIndex = prev.pages.findIndex(
        (page) => pageIdStr(page) === pageIdStr(pageId),
      );
      const fallbackIndex = Math.max(0, deletedIndex - 1);
      const fallback = pageIdStr(nextPages[fallbackIndex]) || "";
      return { pages: nextPages, activePageId: fallback };
    });
  };

  const tabBarProps = {
    pages,
    activePageId: pageIdStr(activePageId),
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
          await createPreset({ workspaceId, payload , userId});
          setCreatePresetOpen(false);
        }}
      />

      {activePage && workspaceId && conversationIdStr ? (
        <LinkToCanvasModal
          open={linkCanvasOpen}
          onClose={() => setLinkCanvasOpen(false)}
          onSuccess={refreshPagesFromServer}
          workspaceId={workspaceId}
          conversationId={conversationIdStr}
          pageId={pageIdStr(activePage)}
          pageName={activePage.name}
          existingCanvasLinks={existingCanvasLinks}
        />
      ) : null}
    </div>
  );
};

export default RightPanel;
