'use client';

import RecordingExperience from "./recording-experience";
import TranscriptCard from "./transcript-card";
import useConversationStore from "../../../../../store/conversation.store";
import { Redo2, Undo2 } from "lucide-react";

const ConversationContent = () => {
    const viewMode = useConversationStore((state) => state.viewMode);
    const conversation = useConversationStore((state) => state.conversation);

    const isProcessing = conversation?.status === "processing";

    return (
        <div className="w-full h-full flex overflow-hidden">
            {/* Left Section */}
            {(viewMode === "split" || viewMode === "left") && (
                <div className={`flex flex-col h-full transition-all duration-300 ${viewMode === "split" ? "w-1/2 border-r border-gray-200" : "w-full"}`}>
                    <div className="flex items-center justify-between px-5 py-2 shrink-0">
                        <span className="text-sm font-medium text-gray-800">Transcript</span>
                        <div className="flex items-center gap-3 text-gray-500">
                            <button disabled={isProcessing} className="disabled:opacity-50">
                                <Undo2 className="h-4 w-4" />
                            </button>
                            <button disabled={isProcessing} className="disabled:opacity-50">
                                <Redo2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col flex-1 p-0 overflow-y-auto">
                        {viewMode === "left"
                            && <RecordingExperience />
                          
                        }
                    </div>
                </div>
            )}

            {/* Right Section */}
            {(viewMode === "split" || viewMode === "right") && (
                <div className={`flex flex-col h-full overflow-y-auto bg-gray-50 transition-all duration-300 ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-white text-gray-400 font-medium p-8 m-6 max-w-4xl mx-auto">
                        Right Section (Summary & Media)
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConversationContent;