import apiInstance from "@/config/apiInstance";

/** Mongo-style ObjectId from JSON, or plain string/number */
function toPageIdString(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && value.$oid != null) {
    return String(value.$oid);
  }
  return "";
}

/**
 * Extract a page document from POST/GET envelopes (`data`, nested `page`, etc.).
 */
export function normalizePageFromApiEnvelope(body) {
  if (body == null || typeof body !== "object") return null;
  const inner = body.data !== undefined ? body.data : body;
  let row = Array.isArray(inner) ? inner[0] : inner;
  if (row != null && typeof row === "object" && !Array.isArray(row)) {
    const nested =
      row.page ??
      row.document ??
      row.summaryPage ??
      row.result;
    if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
      row = nested;
    }
  }
  if (!row || typeof row !== "object") return null;
  const id = toPageIdString(row._id ?? row.id);
  if (!id) return null;
  return { ...row, _id: id };
}

export const createFallbackSummaryPage = () => ({
  _id: "local-summary",
  name: "Summary",
  type: "summary",
  position: 0,
  content: null,
  presetId: null,
  isStale: false,
  generatedAt: null,
  canvasLinks: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const getPages = async ({ workspaceId, conversationId }) => {
  if (!workspaceId || !conversationId) {
    return [createFallbackSummaryPage()];
  }

  try {
    const { data } = await apiInstance.get(
      `/summary-page/workspaces/${workspaceId}/conversations/${conversationId}/pages`,
    );
    const rawList = Array.isArray(data?.data) ? data.data : [];
    const pages = rawList
      .map((p) => normalizePageFromApiEnvelope({ data: p }) ?? p)
      .filter(Boolean);
    return pages.length > 0 ? pages : [createFallbackSummaryPage()];
  } catch (error) {
    console.warn(
      "[right-panel] getPages failed, falling back to local page",
      error,
    );
    return [createFallbackSummaryPage()];
  }
};

export const patchPage = async ({
  workspaceId,
  conversationId,
  pageId,
  payload,
}) => {
  if (!workspaceId || !conversationId || !pageId) return;
  try {
    await apiInstance.patch(
      `/summary-page/workspaces/${workspaceId}/conversations/${conversationId}/pages/${pageId}`,
      payload,
    );
  } catch (error) {
    console.warn("[right-panel] patchPage failed", error);
  }
};

export const deletePage = async ({ workspaceId, conversationId, pageId }) => {
  if (!workspaceId || !conversationId || !pageId) return false;
  try {
    await apiInstance.delete(
      `/summary-page/workspaces/${workspaceId}/conversations/${conversationId}/pages/${pageId}`,
    );
    return true;
  } catch (error) {
    console.warn("[right-panel] deletePage failed", error);
    return false;
  }
};

export const createPage = async ({
  workspaceId,
  conversationId,
  payload,
  userId,
}) => {
  if (!workspaceId || !conversationId) return null;
  try {
    const { data } = await apiInstance.post(
      `/summary-page/workspaces/${workspaceId}/conversations/${conversationId}/pages`,
      { ...payload, userId, workspaceId },
    );
    return normalizePageFromApiEnvelope(data);
  } catch (error) {
    console.warn("[right-panel] createPage failed", error);
    return null;
  }
};

export const getPresets = async ({ workspaceId }) => {
  if (!workspaceId) return [];
  try {
    const { data } = await apiInstance.get(
      `/summary-page/workspaces/${workspaceId}/presets`,
    );
    return Array.isArray(data?.data) ? data.data : [];
  } catch (error) {
    console.warn("[right-panel] getPresets failed", error);
    return [];
  }
};

export const createPreset = async ({ workspaceId, payload, userId }) => {
  if (!workspaceId) return null;
  try {
    const { data } = await apiInstance.post(
      `/summary-page/workspaces/${workspaceId}/presets`,
      { ...payload, userId, workspaceId },
    );
    return data?.data || null;
  } catch (error) {
    console.warn("[right-panel] createPreset failed", error);
    return null;
  }
};

export const updatePreset = async ({ workspaceId, presetId, payload }) => {
  if (!workspaceId || !presetId) return null;
  try {
    const { data } = await apiInstance.patch(
      `/summary-page/workspaces/${workspaceId}/presets/${presetId}`,
      payload,
    );
    return data?.data || null;
  } catch (error) {
    console.warn("[right-panel] updatePreset failed", error);
    return null;
  }
};

export const removePreset = async ({ workspaceId, presetId }) => {
  if (!workspaceId || !presetId) return false;
  try {
    await apiInstance.delete(
      `/summary-page/workspaces/${workspaceId}/presets/${presetId}`,
    );
    return true;
  } catch (error) {
    console.warn("[right-panel] removePreset failed", error);
    return false;
  }
};

/** PATCH …/presets/reorder — returns sorted preset list when successful */
export const reorderPresets = async ({ workspaceId, presetIds }) => {
  if (!workspaceId || !Array.isArray(presetIds)) return null;
  if (presetIds.length === 0) return [];
  try {
    const { data } = await apiInstance.patch(
      `/summary-page/workspaces/${workspaceId}/presets/reorder`,
      { presetIds },
    );
    return Array.isArray(data?.data) ? data.data : null;
  } catch (error) {
    console.warn("[right-panel] reorderPresets failed", error);
    return null;
  }
};

/** GET workspace canvases for “Link to” picker */
export const getWorkspaceCanvases = async ({ workspaceId }) => {
  if (!workspaceId) return [];
  try {
    const { data } = await apiInstance.get(
      `/workspace-chat/all-chats?workspaceId=${workspaceId}`,
    );
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  } catch (error) {
    console.warn("[right-panel] getWorkspaceCanvases failed", error);
    return [];
  }
};

/** PATCH page canvas links — body { canvasIds } */
export const addCanvasLinks = async ({
  workspaceId,
  conversationId,
  pageId,
  canvasIds,
}) => {
  if (!workspaceId || !conversationId || !pageId) return false;
  try {
    await apiInstance.patch(
      `/summary-page/workspaces/${workspaceId}/conversations/${conversationId}/pages/${pageId}/canvas-links`,
      { canvasIds },
    );
    return true;
  } catch (error) {
    console.warn("[right-panel] addCanvasLinks failed", error);
    return false;
  }
};
