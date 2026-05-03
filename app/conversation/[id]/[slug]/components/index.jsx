/**
 * ConversationContent Component
 * Main layout wrapper for the conversation experience.
 * FIX: The left panel now always renders <RecordingExperience /> to prevent unmounting during mode transitions.
 */

'use client';

import RecordingExperience from "./recording-experience";
import useConversationStore from "../../../../../store/conversation.store";
import { ConversationRouteSkeleton } from "../../../../../components/skeletons";
import { Redo2, Undo2 } from "lucide-react";

const ConversationContent = ({ slug }) => {
    const viewMode = useConversationStore((state) => state.viewMode);
    const isLoading = useConversationStore((state) => state.isLoading);
    const conversation = useConversationStore((state) => state.conversation);

    const isProcessing = conversation?.status === "processing";

    if (isLoading) {
        return <ConversationRouteSkeleton viewMode={viewMode} />;
    }

    return (
        <div className="w-full h-full flex overflow-hidden">
            {/* Left Section - Rendered for "left" and "split" modes */}
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
                        {/* RecordingExperience is ALWAYS rendered in the left panel. 
                            It internally handles whether to show recording controls or transcript content. */}
                        <RecordingExperience slug={slug} />
                    </div>
                </div>
            )}

            {/* Right Section - Rendered ONLY for "split" or "right" modes */}
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