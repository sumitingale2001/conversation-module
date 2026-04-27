"use client";

import { Clock, StickyNote, Timer, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const ConversationCard = ({ conversation }) => {
  const emoji = conversation?.emoji || "😀";
  const title = conversation?.title || "";
  const description = conversation?.description || conversation?.summary || "";
  const createdAtLabel = conversation?.createdAtLabel || "";
  const durationLabel =
    conversation?.durationLabel || conversation?.duration || "";
  const pagesCount = conversation?.pages ?? "##";
  const chatsCount = conversation?.chats ?? "##";
  const usersCount = conversation?.users ?? "##";

  return (
    <div className="flex flex-col gap-1 text-[10px] border-b border-[#ECECED] py-4 px-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* emoji  */}
          <span className="text-[10px] leading-[28px]">{emoji}</span>
          <Link
            href={`/conversation/${conversation?._id}/${conversation?.sourceType}`}
            className="font-bold text-[10px] leading-[16pxpx]"
          >
            {title}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Image
            src={conversation?.isStarred ? "/golden-star.svg" : "/star.svg"}
            width={20}
            height={20}
            alt="star"
          />
          <Image
            src="/three-dots.svg"
            width={20}
            height={20}
            alt="three-dots"
          />
        </div>
      </div>
      <p className="font-normal text-[10px] leading-[16px]">{description}</p>
      <div className="flex items-center gap-2 text-[#262626]">
        <div className="flex items-center gap-1">
          <Clock size={12} /> <span>{createdAtLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Image src="/clock-timer.svg" width={12} height={12} alt="audio" />
          <span>{durationLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <StickyNote size={12} /> <span>{pagesCount} pages</span>
        </div>
        <div className="flex items-center gap-1">
          <Image src="/chat-icon.svg" width={12} height={12} alt="chat-icon" />
          <span>{chatsCount} chats</span>
        </div>
        <div className="flex items-center gap-1">
          <User size={12} className="text-[#262626]" />
          <span>{usersCount} users</span>
        </div>
      </div>
    </div>
  );
};

export default ConversationCard;
