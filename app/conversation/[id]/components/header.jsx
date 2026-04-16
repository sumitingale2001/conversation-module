"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { useParams } from "next/navigation";
import useRenameConversation from "../../../../hooks/use-rename-conversation";
import useUpdateEmoji from "../../../../hooks/use-update-emoji";
import useToggleStar from "../../../../hooks/use-toggle-star";
import useConversationStore from "../../../../store/conversation.store";
import { HeaderSkeleton } from "../../../../components/skeletons";





const EmojiAndTitleSection = () => {
    const conversation = useConversationStore((state) => state.conversation);
    const emoji = conversation?.emoji || "😀";
    const storeTitle = conversation?.title || "Untitled";

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [title, setTitle] = useState("Untitled");
    const pickerRef = useRef(null);
    const params = useParams();
    const { renameConversation } = useRenameConversation();
    const { updateEmoji } = useUpdateEmoji();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (storeTitle) {
            setTitle(storeTitle);
        }
    }, [storeTitle]);

    return <div className="flex items-center gap-5">
        <div className="relative" ref={pickerRef}>
            <div
                className="h-[32px] w-[32px] rounded-[8px] bg-[#DBDDE080] flex items-center justify-center cursor-pointer"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
                <span className="text-[18px] leading-none">{emoji}</span>
            </div>

            {showEmojiPicker && (
                <div className="absolute top-[40px] left-0 z-50">
                    <EmojiPicker
                        onEmojiClick={(emojiData) => {
                            updateEmoji({
                                conversationId: params?.id,
                                workspaceId: "681896a0b95b90b6f3996ed7",
                                emoji: emojiData.emoji
                            });
                            setShowEmojiPicker(false);
                        }}
                    />
                </div>
            )}
        </div>
        <form
            onSubmit={(e) => {
                e.preventDefault();
                renameConversation({
                    conversationId: params?.id,
                    workspaceId: "681896a0b95b90b6f3996ed7", // Hardcoded standard mapping per search-and-create.jsx
                    title: title
                });
            }}
            className="flex flex-col gap-1"
        >
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-bold text-[20px] leading-[28px] outline-none focus:outline-none border-none bg-transparent min-w-[150px] cursor-text"
                placeholder="Untitled"
            />
            <div className="flex items-center gap-1 text-[#666666]">
                <Image src="/upload-media.png" height={16} width={16} alt="cloud" />
                <span className="text-xs" >|</span>
                <span className="text-xs">{conversation?.formattedDuration}</span>
                <span className="text-xs">|</span>
                <span className="text-xs">{conversation?.formattedCreatedAt}</span>
            </div>
        </form>
    </div>
}


const OtherOptions = () => {
    const { conversation, viewMode, setViewMode } = useConversationStore();
    const isStarred = conversation?.isStarred || false;
    const { toggleStar } = useToggleStar();
    const params = useParams();

    return <div className="flex items-center gap-3">
        <Image
            src={isStarred ? '/golden-star.svg' : '/star.svg'}
            width={24}
            height={24}
            alt="star"
            className="cursor-pointer transition-transform active:scale-95"
            onClick={() => toggleStar({ conversationId: params?.id, workspaceId: "681896a0b95b90b6f3996ed7" })}
        />
        <Image className="cursor-pointer" src={'/three-dots.svg'} width={24} height={24} alt="three-dots" />
        <div className="flex items-center gap-1 justify-center p-1 border border-gray-400 rounded-[8px]">
            <div 
                className={`flex items-center justify-center p-1 cursor-pointer rounded-md border transition-all duration-200 ${viewMode === 'left' ? 'border-gray-300 bg-gray-100 shadow-sm' : 'border-transparent hover:bg-gray-50'}`}
                onClick={() => setViewMode(viewMode === 'left' ? 'split' : 'left')}
            >
                <Image src='/recording.svg' width={20} height={20} alt="recording" />
            </div>
            <span className="text-gray-400 select-none">|</span>
            <div 
                className={`flex items-center justify-center p-1 cursor-pointer rounded-md border transition-all duration-200 ${viewMode === 'right' ? 'border-gray-300 bg-gray-100 shadow-sm' : 'border-transparent hover:bg-gray-50'}`}
                onClick={() => setViewMode(viewMode === 'right' ? 'split' : 'right')}
            >
                <Image src='/media-file.svg' width={20} height={20} alt="file" />
            </div>
        </div>
        <Image className="cursor-pointer" src={'/chat-icon.svg'} width={24} height={24} alt="chat" />
    </div>
}


const Header = () => {
    const isLoading = useConversationStore((state) => state.isLoading);

    if (isLoading) {
        return <HeaderSkeleton />;
    }

    return <div className="border-b border-gray-200 w-full">
        <div className="w-full mx-auto h-[60px]  items-center px-4 gap-2 flex justify-between">
            <EmojiAndTitleSection />
            <OtherOptions />
        </div>
    </div>
}

export default Header;