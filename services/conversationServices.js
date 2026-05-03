import apiInstance from "../config/apiInstance";

/**
 * ROUNDING HELPER
 * Ensures all duration/time values are kept to 3 decimal places as per contract.
 */
export const roundVal = (val) =>
  typeof val === "number" ? parseFloat(val.toFixed(3)) : val;

/**
 * RESPONSE NORMALIZER
 * Converts axios/network responses into the standard { success, data, error, code } format.
 * Strictly handles 409 conflicts by throwing to allow caller refetch logic.
 */
const request = async (apiCall) => {
  try {
    const response = await apiCall;
    return {
      success: true,
      data: response?.data?.data ?? response?.data ?? response,
      error: null,
      code: response?.status || 200,
    };
  } catch (error) {
    const code = error?.response?.status || 500;
    const message =
      error?.response?.data?.error || error?.message || "Unknown Error";

    const errorPayload = {
      success: false,
      data: null,
      error: message,
      code: code,
    };

    if (code === 409) {
      throw { ...errorPayload, isConflict: true };
    }

    return errorPayload;
  }
};

export const conversationServices = {
  // --- CONVERSATION APIs ---
  async createConversation(payload) {
    if (!payload.workspaceId || !payload.userId) return null;
    return await request(apiInstance.post("/conversations/create", payload));
  },

  async getConversation(conversationId, workspaceId) {
    if (!conversationId || !workspaceId) return null;
    return await request(
      apiInstance.get(
        `/conversations?conversationId=${conversationId}&workspaceId=${workspaceId}`,
      ),
    );
  },

  // Alias for getConversation used in timeline hooks
  async getTimeline(conversationId, workspaceId) {
    return this.getConversation(conversationId, workspaceId);
  },

  async updateTitle(payload) {
    if (!payload.conversationId || !payload.workspaceId || !payload.title)
      return null;
    return await request(apiInstance.patch("/conversations/title", payload));
  },

  // Alias for updateTitle used in hooks
  async updateConversationTitle(payload) {
    return this.updateTitle(payload);
  },

  async updateEmoji(payload) {
    if (!payload.conversationId || !payload.workspaceId || !payload.emoji)
      return null;
    return await request(apiInstance.patch("/conversations/emoji", payload));
  },

  // Alias for updateEmoji used in hooks
  async updateConversationEmoji(payload) {
    return this.updateEmoji(payload);
  },

  async toggleStar(payload) {
    if (!payload.conversationId || !payload.workspaceId) return null;
    return await request(apiInstance.patch("/conversations/star", payload));
  },

  // Alias for toggleStar used in hooks
  async toggleConversationStar(payload) {
    return this.toggleStar(payload);
  },

  // --- RECORDING APIs ---
  async appendSegment(payload) {
    if (!payload.conversationId || !payload.workspaceId) return null;

    const sanitized = {
      ...payload,
      duration: roundVal(payload.duration),
      startTime: roundVal(payload.startTime),
      endTime: roundVal(payload.endTime),
    };

    return await request(
      apiInstance.post("/conversations/recording/append", sanitized),
    );
  },

  // Alias for appendSegment used in hooks
  async appendRecording(payload) {
    return this.appendSegment(payload);
  },

  async replaceSegment(payload) {
    if (!payload.conversationId || !payload.workspaceId) return null;

    const sanitized = {
      ...payload,
      duration: roundVal(payload.duration),
      startTime: roundVal(payload.startTime),
      endTime: roundVal(payload.endTime),
    };

    return await request(
      apiInstance.post("/conversations/recording/replace", sanitized),
    );
  },

  // Alias for replaceSegment used in hooks
  async replaceRecording(payload) {
    return this.replaceSegment(payload);
  },

  /** Scrib+Replace live range (POST /conversations/replace) */
  async replaceRecordingRange({
    conversationId,
    workspaceId,
    fileUrl,
    startTime,
    endTime,
  }) {
    if (!conversationId || !workspaceId || !fileUrl) return null;
    return await request(
      apiInstance.post("/conversations/replace", {
        conversationId,
        workspaceId,
        fileUrl,
        startTime: roundVal(startTime),
        endTime: roundVal(endTime),
      }),
    );
  },

  /**
   * Resolve or create a workspace user tag by name (POST /tags/create-tag).
   * Required before PUT /transcript/block/add-tag (global tagId).
   */
  async ensureUserTagByName(userId, name) {
    const normalized = (name || "").trim();
    if (!normalized || !userId) return null;

    let allTags = [];
    const allTagsRes = await this.getAllTags(userId);
    if (allTagsRes?.success !== false) {
      allTags = allTagsRes?.data?.tags || [];
    }

    let selected = allTags.find(
      (tag) =>
        tag?.name?.trim?.()?.toLowerCase() === normalized.toLowerCase(),
    );
    if (!selected) {
      const createRes = await this.createTag({
        userId,
        name: normalized,
      });
      selected = createRes?.data?.tag || null;
    }
    return selected;
  },

  async reorderSegments(payload) {
    if (!payload.conversationId || !payload.workspaceId || !payload.segmentIds)
      return null;
    return await request(
      apiInstance.post("/conversations/recording/reorder", payload),
    );
  },

  async moveConversation(payload) {
    const { conversationId, workspaceId, segmentId, direction } = payload || {};
    if (!conversationId || !workspaceId || !segmentId || !direction) return null;
    return await request(
      apiInstance.patch("/conversations/move", {
        conversationId,
        workspaceId,
        segmentId,
        direction,
      }),
    );
  },

  async deleteConversation(id, data) {
    if (!id) return null;
    return await request(
      apiInstance.delete(`/conversations/${id}`, { data: data || {} }),
    );
  },

  async deleteSegment({ segmentId, workspaceId, conversationId }) {
    if (!segmentId || !workspaceId || !conversationId) return null;
    return await request(
      apiInstance.delete(`/conversations/segment/${segmentId}`, {
        data: { workspaceId, conversationId },
      }),
    );
  },

  async renameSegment({ segmentId, conversationId, workspaceId, name }) {
    if (!segmentId || !conversationId || !workspaceId || !name) return null;
    return await request(
      apiInstance.patch(`/conversations/segment/${segmentId}/rename`, {
        conversationId,
        workspaceId,
        name,
      }),
    );
  },

  ensureTranscript: async ({ conversationId, workspaceId }) => {
    try {
      const { data } = await apiInstance.get(
        `/transcript?conversationId=${conversationId}&workspaceId=${workspaceId}`,
      );
      return data;
    } catch (err) {
      console.error("[conversationServices] ensureTranscript failed:", err);
      return {
        success: false,
        error: err?.response?.data?.error || err.message,
      };
    }
  },

  triggerTranscription: async ({ conversationId, workspaceId }) => {
    try {
      const { data } = await apiInstance.post("/transcript/transcribe", {
        conversationId,
        workspaceId,
      });
      return data;
    } catch (err) {
      console.error("[conversationServices] triggerTranscription failed:", err);
      return {
        success: false,
        error: err?.response?.data?.error || err.message,
      };
    }
  },

  // --- TAG APIs ---

  async updateTag(payload) {
    if (!payload.tagInstanceId || payload.timestamp === undefined) return null;

    const sanitized = {
      ...payload,
      timestamp: roundVal(payload.timestamp),
    };

    return await request(apiInstance.patch("/timeline/tags/update", sanitized));
  },

  async deleteTag(tagInstanceId) {
    if (!tagInstanceId) return null;
    return await request(
      apiInstance.delete(
        `/timeline/tags/delete?tagInstanceId=${tagInstanceId}`,
      ),
    );
  },

  async renameSpeaker(payload) {
    if (!payload.transcriptId || !payload.speakerId || !payload.name)
      return null;
    return await request(
      apiInstance.patch("/transcript/speaker/rename", payload),
    );
  },

  async createSpeakerAndAssign(payload) {
    if (
      !payload.transcriptId ||
      !payload.workspaceId ||
      !payload.blockId ||
      !payload.name
    ) {
      return null;
    }
    return await request(
      apiInstance.post("/transcript/create-speaker-and-assign", payload),
    );
  },

  async reassignBlockSpeaker(payload) {
    if (
      !payload.transcriptId ||
      !payload.workspaceId ||
      !payload.blockId ||
      !payload.speakerId
    ) {
      return null;
    }
    return await request(
      apiInstance.patch("/transcript/block/reassign-speaker", payload),
    );
  },

  async updateTranscriptBlock(payload) {
    if (!payload?.transcriptId || !payload?.workspaceId || !payload?.blockId)
      return null;
    return await request(
      apiInstance.patch("/transcript/block/update", payload),
    );
  },

  async addTranscriptBlock(payload) {
    if (
      !payload?.transcriptId ||
      !payload?.workspaceId ||
      !payload?.afterBlockId
    )
      return null;
    return await request(apiInstance.post("/transcript/block/add", payload));
  },

  async deleteTranscriptBlock(payload) {
    if (!payload?.transcriptId || !payload?.workspaceId || !payload?.blockId)
      return null;
    return await request(
      apiInstance.delete("/transcript/block/delete", { data: payload }),
    );
  },

  async toggleTranscriptBlockActive(payload) {
    if (
      !payload?.transcriptId ||
      !payload?.workspaceId ||
      !payload?.blockId ||
      typeof payload?.isActive !== "boolean"
    ) {
      return null;
    }
    return await request(
      apiInstance.patch("/transcript/block/toggle-active", payload),
    );
  },

  async restoreTranscriptBlock(payload) {
    if (!payload?.transcriptId || !payload?.workspaceId || !payload?.blockId) {
      return null;
    }
    return await request(
      apiInstance.patch("/transcript/block/restore", payload),
    );
  },

  async getAllTags(userId) {
    if (!userId) return null;
    return await request(apiInstance.get(`/tags/all?userId=${userId}`));
  },

  async createTag(payload) {
    if (!payload?.userId || !payload?.name) return null;
    return await request(
      apiInstance.post(`/tags/create-tag?userId=${payload.userId}`, {
        name: payload.name,
      }),
    );
  },

  async addTagToBlock(payload) {
    if (
      !payload?.transcriptId ||
      !payload?.workspaceId ||
      !payload?.blockId ||
      !payload?.tagId
    ) {
      return null;
    }
    return await request(apiInstance.put("/transcript/block/add-tag", payload));
  },
};
