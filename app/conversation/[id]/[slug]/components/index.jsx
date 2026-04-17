'use client';

import TimelineEditor from "./timeline-editor";
import RecordingExperience from "./recording-experience";
import useConversationStore from "../../../../../store/conversation.store";

const ConversationContent = () => {
    const viewMode = useConversationStore((state) => state.viewMode);
    const conversation = useConversationStore((state) => state.conversation);

    const isCompleted = conversation?.status === "completed";

    return (
        <div className="w-full h-full flex overflow-hidden">
            {/* Left Section: Transcript and Timeline */}
            {(viewMode === "split" || viewMode === "left") && (
                <div 
                    className={`flex flex-col h-full p-0 transition-all duration-300 ${
                        viewMode === "split" ? "w-1/2 border-r border-gray-200" : "w-full max-w-4xl mx-auto"
                    }`}
                >
                    {!isCompleted ? <RecordingExperience /> : <div className="p-6 h-full flex flex-col"><TimelineEditor /></div>}
                </div>
            )}

            {/* Right Section: Summary and Media */}
            {(viewMode === "split" || viewMode === "right") && (
                <div 
                    className={`flex flex-col h-full p-6 transition-all duration-300 overflow-y-auto bg-gray-50 ${
                        viewMode === "split" ? "w-1/2" : "w-full max-w-4xl mx-auto"
                    }`}
                >
                    {/* Placeholder for the Right Section Content */}
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-white text-gray-400 font-medium p-8">
                        Right Section (Summary & Media)
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConversationContent;