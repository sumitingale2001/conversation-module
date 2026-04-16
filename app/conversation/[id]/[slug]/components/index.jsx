'use client';

import Transcript from "./transcript";
import useConversationStore from "../../../../../store/conversation.store";

const ConversationContent = () => {
    const viewMode = useConversationStore((state) => state.viewMode);

    return (
        <div className="w-full min-h-[calc(100vh-60px)] flex flex-col md:flex-row items-stretch gap-6">
            {/* Left Section */}
            {(viewMode === "split" || viewMode === "left") && (
                <div className={`flex flex-col h-full p-6 transition-all duration-300 ${viewMode === "split" ? "flex-1 border-r border-gray-200" : "w-full max-w-4xl mx-auto"}`}>
                    <div className="flex-1 h-full">
                        <Transcript />
                    </div>
                </div>
            )}

            {/* Right Section */}
            {(viewMode === "split" || viewMode === "right") && (
                <div className={`flex flex-col h-full p-6 transition-all duration-300 ${viewMode === "split" ? "flex-1" : "w-full max-w-4xl mx-auto"}`}>
                    <div className="flex-1 h-full">
                        {/* Placeholder for the Right Section Content */}
                        <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400 font-medium">
                            Right Section (Summary & Media)
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConversationContent;