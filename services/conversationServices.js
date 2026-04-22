import apiInstance from "../config/apiInstance";

/**
 * ROUNDING HELPER
 * Ensures all duration/time values are kept to 3 decimal places as per contract.
 */
export const roundVal = (val) => (typeof val === "number" ? parseFloat(val.toFixed(3)) : val);

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
    const message = error?.response?.data?.error || error?.message || "Unknown Error";

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
      apiInstance.get(`/conversations?conversationId=${conversationId}&workspaceId=${workspaceId}`)
    );
  },

  // Alias for getConversation used in timeline hooks
  async getTimeline(conversationId, workspaceId) {
    return this.getConversation(conversationId, workspaceId);
  },

  async updateTitle(payload) {
    if (!payload.conversationId || !payload.workspaceId || !payload.title) return null;
    return await request(apiInstance.patch("/conversations/title", payload));
  },

  // Alias for updateTitle used in hooks
  async updateConversationTitle(payload) {
    return this.updateTitle(payload);
  },

  async updateEmoji(payload) {
    if (!payload.conversationId || !payload.workspaceId || !payload.emoji) return null;
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

    return await request(apiInstance.post("/conversations/recording/append", sanitized));
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

    return await request(apiInstance.post("/conversations/recording/replace", sanitized));
  },

  // Alias for replaceSegment used in hooks
  async replaceRecording(payload) {
    return this.replaceSegment(payload);
  },

  async ensureTranscript(payload) {
    if (!payload.conversationId || !payload.workspaceId) return null;
    return await request(
      apiInstance.get(`/transcript?conversationId=${payload.conversationId}&workspaceId=${payload.workspaceId}`)
    );
  },

  async triggerTranscription(payload) {
    if (!payload.conversationId || !payload.workspaceId) return null;
    return await request(apiInstance.post("/transcript/transcribe", payload));
  },

  // --- TAG APIs ---
  async attachTag(payload) {
    if (!payload.conversationId || !payload.tagId || payload.timestamp === undefined) return null;

    const sanitized = {
      ...payload,
      timestamp: roundVal(payload.timestamp),
    };

    return await request(apiInstance.post("/timeline/tags/attach", sanitized));
  },

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
    return await request(apiInstance.delete(`/timeline/tags/delete?tagInstanceId=${tagInstanceId}`));
  },
};
