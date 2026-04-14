import apiInstance from "../config/apiInstance";


export const conversationServices = {
    async createConversation(data) {
        return await apiInstance.post("/conversations/create", data);
    },
    async getConversation(conversationId, workspaceId) {
        return await apiInstance.get(`/conversations?conversationId=${conversationId}&workspaceId=${workspaceId}`);
    }
}