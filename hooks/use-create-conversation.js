"use client"
import { useRouter } from "next/navigation";
import ApiService from "../services";
import useLoading from "./use-loading";

const useCreateConversation = () => {

    const { setLoading, loading } = useLoading();
    const router = useRouter()

    const handleCreateConversation = async (payload) => {
        setLoading(true)
        try {
            const body = {
                title: payload.title,
                description: payload.description,
                sourceType: payload.sourceType,
                workspaceId: payload.workspaceId,
                userId: payload.userId,
            }

            const response = await ApiService.createConversation(body);
            setLoading(false)

            router.push(`/conversation/${payload.sourceType}/${response.data.data._id}`)

        } catch (error) {
            setLoading(false)
            console.log(error)
        }
    }

    return {
        handleCreateConversation,
        loading
    }

}

export default useCreateConversation;