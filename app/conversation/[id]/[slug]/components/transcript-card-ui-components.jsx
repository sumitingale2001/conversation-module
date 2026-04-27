"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Loader2,
  Check,
  Plus,
  Tag,
  RotateCcw,
  EyeOff,
  Trash2,
  PenLine,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Popover } from "@mui/material";
import { createPortal } from "react-dom";
import { conversationServices } from "../../../../../services/conversationServices";

export const AssignSpeakerPopover = ({
  speaker,
  transcriptId,
  workspaceId,
  blockId,
  anchorEl,
  open,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(speaker?.name || "");
  const [emoji, setEmoji] = useState(speaker?.avatarEmoji || "🎙️");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiData) => {
    setEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const hasChanges = speaker
    ? name.trim() !== speaker?.name || emoji !== speaker?.avatarEmoji
    : true;

  const canSave = name.trim().length > 0 && hasChanges && !saving;

  const handleSave = async () => {
    if (!canSave || saving) return;

    setSaving(true);
    try {
      if (speaker?._id) {
        const response = await conversationServices.renameSpeaker({
          transcriptId,
          workspaceId,
          speakerId: speaker._id,
          name: name.trim(),
          avatarEmoji: emoji,
        });

        if (!response?.success) return;

        onSaved({
          type: "rename",
          speakerId: speaker._id,
          blockId,
          name: name.trim(),
          emoji,
        });
      } else {
        const response = await conversationServices.createSpeakerAndAssign({
          transcriptId,
          workspaceId,
          blockId,
          name: name.trim(),
          avatarEmoji: emoji,
        });

        if (!response?.success) return;

        const createdSpeaker = response?.data?.speaker;
        const assignedBlock = response?.data?.block;
        if (!createdSpeaker?._id || !assignedBlock?._id) return;

        onSaved({
          type: "createAndAssign",
          speakerId: createdSpeaker._id,
          blockId: assignedBlock._id,
          name: createdSpeaker.name,
          emoji: createdSpeaker.avatarEmoji || emoji,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && canSave) handleSave();
    if (e.key === "Escape") onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{
        className: "rounded-xl p-3 w-[336px]!  border border-gray-100",
      }}
    >
      <div className="rounded-xl p-3 w-[336px]  border border-gray-100">
        <p className="text-[14px] font-bold leading-[20px] text-gray-700 mb-2">
          Assign Speaker
        </p>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="h-9 w-9 flex items-center cursor-pointer justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-base border border-gray-200"
            >
              {emoji}
            </button>

            {showEmojiPicker &&
              createPortal(
                <div
                  className="fixed z-9999 shadow-xl rounded-xl overflow-hidden"
                  style={{
                    top: pickerRef.current?.getBoundingClientRect().bottom + 8,
                    left: pickerRef.current?.getBoundingClientRect().left,
                  }}
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    height={320}
                    width={280}
                    previewConfig={{ showPreview: false }}
                  />
                </div>,
                document.body,
              )}
          </div>

          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Speaker name"
            className="flex-1 h-9 px-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#221B88] focus:ring-1 focus:ring-blue-500/20 bg-white"
          />
        </div>

        <div className="flex items-center  gap-2">
          <button
            onClick={onClose}
            type="button"
            className="px-3 py-1.5 text-sm flex-1 cursor-pointer rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!canSave}
            type="submit"
            className="px-3 py-1.5 text-sm  flex-1 cursor-pointer rounded-lg bg-[#221B88] text-white hover:bg-[#221B88] disabled:bg-gray-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </Popover>
  );
};

export const SpeakerLabel = ({
  speaker,
  transcriptId,
  workspaceId,
  blockId,
  onSaved,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors"
      >
        <span>{speaker?.name || "Speaker 1"}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <AssignSpeakerPopover
          speaker={speaker}
          transcriptId={transcriptId}
          workspaceId={workspaceId}
          blockId={blockId}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onSaved={onSaved}
        />
      )}
    </>
  );
};

export const BlockActionsMenu = ({ anchorEl, open, onClose, onAddTag }) => {
  const itemClass =
    "w-full flex items-center gap-2 px-3 py-2 text-sm text-[#3A3A3A] hover:bg-gray-50";

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{
        className: "rounded-[12px] border border-[#E5E5E5] shadow-sm mt-1",
      }}
    >
      <div className="w-[148px] py-1">
        <button type="button" className={itemClass}>
          <Plus size={16} />
          <span>Add block</span>
        </button>
        <button type="button" className={itemClass} onClick={onAddTag}>
          <Tag size={16} />
          <span>Add tags</span>
        </button>
        <button type="button" className={itemClass}>
          <RotateCcw size={16} />
          <span>Restore</span>
        </button>
        <button type="button" className={itemClass}>
          <EyeOff size={16} />
          <span>Disable</span>
        </button>
        <button type="button" className={itemClass}>
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
      </div>
    </Popover>
  );
};

export const AddTagPopover = ({
  anchorEl,
  open,
  onClose,
  blockTime,
  existingTags,
  onSaveTag,
}) => {
  const [newTag, setNewTag] = useState("");

  const canSave = newTag.trim().length > 0;

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{
        className: "rounded-[16px] border border-[#E5E5E5] shadow-md",
      }}
    >
      <div className="w-[430px] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[32px] leading-none font-semibold text-[#2A2A2A]">
            {blockTime}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full text-[#7A7A7A] hover:bg-gray-100"
          >
            -
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <PenLine size={22} className="text-[#666]" />
          {(existingTags || []).map((tagItem) => (
            <span
              key={tagItem.id}
              className={`inline-flex h-7 items-center rounded-full px-3 text-sm ${
                tagItem.type === "ask"
                  ? "bg-[#FFF2D8] border border-[#F1B84A] text-[#B87400]"
                  : "bg-[#EAF1FF] border border-[#5E8BFF] text-[#2F68FF]"
              }`}
            >
              {tagItem.label}
            </span>
          ))}
        </div>

        <div className="my-3 border-t border-[#D9D9D9]" />

        <p className="text-2xl text-[#3A3A3A] leading-none">Quickly add a new tag</p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className="h-10 w-10 rounded-[10px] border border-[#E2B84B] bg-[#FFF4DA]"
          />
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add new"
            className="h-10 flex-1 rounded-[10px] border border-[#D4D4D4] px-3 text-base text-[#444] outline-none placeholder:text-[#B2B2B2]"
          />
          <button
            type="button"
            disabled={!canSave}
            onClick={() => {
              onSaveTag(newTag.trim());
              setNewTag("");
            }}
            className="h-10 w-10 rounded-[10px] bg-[#DCDCDC] text-white disabled:opacity-70"
          >
            <Check size={20} className="mx-auto" />
          </button>
        </div>
      </div>
    </Popover>
  );
};
