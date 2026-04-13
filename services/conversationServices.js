import apiInstance from "../config/apiInstance";


export const conversationServices = {
    async createConversation(data) {
        return await apiInstance.post("/conversations/create", data);
    }
}