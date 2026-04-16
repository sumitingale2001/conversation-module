import apiInstance from "../config/apiInstance";


const CONVERSATIONS = "/conversations";

export const conversationServices = {
    async createConversation(data) {
        return await apiInstance.post(`${CONVERSATIONS}/create`, data);
    },
    async getConversation(conversationId, workspaceId) {
        return await apiInstance.get(`${CONVERSATIONS}?conversationId=${conversationId}&workspaceId=${workspaceId}`);
    },
    async updateConversationTitle(data) {
        return await apiInstance.patch(`${CONVERSATIONS}/title`, data);
    },
    async updateConversationEmoji(data) {
        return await apiInstance.patch(`${CONVERSATIONS}/update-emoji`, data);
    },
    async toggleConversationStar(data) {
        return await apiInstance.patch(`${CONVERSATIONS}/star`, data);
    },
    async getTimeline(conversationId, workspaceId) {
        return await apiInstance.get(`${CONVERSATIONS}/${conversationId}/timeline?workspaceId=${workspaceId}`);
    },
    async appendRecording(data) {
        return await apiInstance.post(`/recording/append`, data);
    },
    async replaceRecording(data) {
        return await apiInstance.post(`/recording/replace`, data);
    }
}
