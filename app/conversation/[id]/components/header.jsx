"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";





const EmojiAndTitleSection = () => {
    const [emoji, setEmoji] = useState("😀");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [title, setTitle] = useState("New Recording");
    const pickerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
                            setEmoji(emojiData.emoji);
                            setShowEmojiPicker(false);
                        }}
                    />
                </div>
            )}
        </div>
        <div className="flex flex-col gap-1">
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-bold text-[20px] leading-[28px] outline-none focus:outline-none border-none bg-transparent min-w-[150px] cursor-text"
                placeholder="Untitled"
            />
            <div className="flex items-center gap-1 text-[#666666]">
                <Image src="/upload-media.png" height={16} width={16} alt="cloud" />
                <span className="text-xs" >|</span>
                <span className="text-xs">00:00:25</span>
                <span className="text-xs">|</span>
                <span className="text-xs">31 Jul, 3.55 pm </span>
            </div>
        </div>
    </div>
}


const OtherOptions = () => {
    return <div className="flex items-center gap-3">
        <Image src={'/star.svg'} width={24} height={24} alt="star" />
        <Image src={'/three-dots.svg'} width={24} height={24} alt="three-dots" />
        <div className="flex items-center gap-1 justify-center p-1 border border-gray-500 rounded-[8px]">
            <Image src='/recording.svg' width={24} height={24} alt="recording" />
            <span>|</span>
            <Image src='/media-file.svg' width={24} height={24} alt="file" />
        </div>
        <Image src={'/chat-icon.svg'} width={24} height={24} alt="chat" />
    </div>
}


const Header = () => {
    return <div className="border-b border-gray-200 w-full">
        <div className="max-w-[1215px] w-full mx-auto h-[60px]  items-center px-4 gap-2 flex justify-between">
            <EmojiAndTitleSection />
            <OtherOptions />
        </div>
    </div>
}

export default Header;