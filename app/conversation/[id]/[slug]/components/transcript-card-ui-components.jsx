"use client";

import React, { useState, useRef } from "react";
import {
  ChevronDown,
  Loader2,
  Check,
  Plus,
  Tag,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  PenLine,
  ArrowUp,
  ArrowDown,
  AudioLines,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Popover, Menu, MenuItem } from "@mui/material";
import { createPortal } from "react-dom";
import { conversationServices } from "../../../../../services/conversationServices";

export const AssignSpeakerPopover = ({
  speaker,
  sectionSpeakers = [],
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
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false);

  const pickerRef = useRef(null);
  const speakerInputRef = useRef(null);

  const handleEmojiClick = (emojiData) => {
    setEmoji(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const hasChanges = speaker
    ? name.trim() !== speaker?.name || emoji !== speaker?.avatarEmoji
    : true;

  const canSave = name.trim().length > 0 && hasChanges && !saving;
  const normalizedName = name.trim().toLowerCase();
  const filteredSpeakers = sectionSpeakers.filter((item) =>
    item?.name?.toLowerCase().includes(normalizedName),
  );

  const handleSelectExistingSpeaker = async (selectedSpeaker) => {
    if (!selectedSpeaker?._id || saving) return;

    setSaving(true);
    try {
      const response = await conversationServices.reassignBlockSpeaker({
        transcriptId,
        workspaceId,
        blockId,
        speakerId: selectedSpeaker._id,
      });
      if (!response?.success) return;

      onSaved({
        type: "reassign",
        speakerId: selectedSpeaker._id,
        blockId,
        name: selectedSpeaker.name,
        emoji: selectedSpeaker.avatarEmoji || "🎙️",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

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

  const handleCreateNewSpeaker = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return;

    setSaving(true);
    try {
      const response = await conversationServices.createSpeakerAndAssign({
        transcriptId,
        workspaceId,
        blockId,
        name: trimmedName,
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
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          onClose();
        }
      }}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
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
            ref={speakerInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={() => setShowSpeakerDropdown(true)}
            placeholder="Speaker name"
            className="flex-1 h-9 px-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#221B88] focus:ring-1 focus:ring-blue-500/20 bg-white"
          />
        </div>

        <Popover
          open={
            showSpeakerDropdown &&
            (filteredSpeakers.length > 0 || name.trim().length > 0)
          }
          anchorEl={speakerInputRef.current}
          onClose={(_, reason) => {
            if (reason === "backdropClick" || reason === "escapeKeyDown") {
              setShowSpeakerDropdown(false);
            }
          }}
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{
            className:
              "mt-1 max-h-52 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm",
            style: {
              width: speakerInputRef.current?.offsetWidth || undefined,
            },
          }}
        >
          <div className="p-1">
            {name.trim().length > 0 ? (
              <button
                type="button"
                onClick={handleCreateNewSpeaker}
                className="mb-1 w-full rounded-md bg-[#EEF0FF] px-3 py-2 text-left text-sm font-semibold text-[#2A2A8A] hover:bg-[#E5E8FF]"
              >
                Create new speaker &quot;{name.trim()}&quot;
              </button>
            ) : null}
            {filteredSpeakers.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => handleSelectExistingSpeaker(item)}
                className="w-full rounded-md flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className="text-base">{item.avatarEmoji || "🎙️"}</span>
                <span className="text-sm font-medium text-[#5A5A5A]">
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </Popover>

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
  sectionSpeakers,
  transcriptId,
  workspaceId,
  blockId,
  onSaved,
  disabled = false,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    if (disabled) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const labelText = speaker?.name || (speaker ? "Speaker 1" : "Add Speaker");

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed"
      >
        <span>{labelText}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <AssignSpeakerPopover
          speaker={speaker}
          sectionSpeakers={sectionSpeakers}
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

export const BlockActionsMenu = ({
  anchorEl,
  open,
  onClose,
  onAddTag,
  onAddBlock,
  addBlockDisabled,
  addTagDisabled,
  onDeleteBlock,
  deleteBlockDisabled,
  onToggleBlockActive,
  toggleBlockActiveDisabled,
  targetBlockIsActive = true,
  showRestore = false,
  onRestoreBlock,
  restoreBlockDisabled,
  manualBlockMenuOnly = false,
}) => {
  const itemClass =
    "w-full flex items-center gap-2 px-3 py-2 text-sm text-[#3A3A3A] hover:bg-gray-50 cursor-pointer";

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          onClose();
        }
      }}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{
        className: "rounded-[12px] border border-[#E5E5E5] shadow-sm mt-1",
      }}
    >
      <div className="w-[148px] py-1">
        {manualBlockMenuOnly ? (
          <button
            type="button"
            disabled={deleteBlockDisabled}
            className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed`}
            onClick={() => onDeleteBlock?.()}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={addBlockDisabled}
              className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              onClick={() => onAddBlock?.()}
            >
              <Plus size={16} />
              <span>Add block</span>
            </button>
            <button
              type="button"
              disabled={addTagDisabled}
              className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              onClick={() => onAddTag?.()}
            >
              <Tag size={16} />
              <span>Add tags</span>
            </button>
            {showRestore ? (
              <button
                type="button"
                disabled={restoreBlockDisabled}
                className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                onClick={() => onRestoreBlock?.()}
              >
                <RotateCcw size={16} />
                <span>Restore</span>
              </button>
            ) : null}
            <button
              type="button"
              disabled={toggleBlockActiveDisabled}
              className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              onClick={() => onToggleBlockActive?.()}
            >
              {targetBlockIsActive ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
              <span>{targetBlockIsActive ? "Disable" : "Enable"}</span>
            </button>
            <button
              type="button"
              disabled={deleteBlockDisabled}
              className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed`}
              onClick={() => onDeleteBlock?.()}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </>
        )}
      </div>
    </Popover>
  );
};

export const SegmentMainActionsMenu = ({
  anchorEl,
  open,
  onClose,
  isFirst,
  isLast,
  moveDisabled,
  onMoveUp,
  onMoveDown,
  onAppendRecording,
  onDelete,
}) => {
  const itemClass =
    "w-full flex items-center gap-2 px-3 py-2 text-sm text-[#3A3A3A] hover:bg-gray-50 cursor-pointer text-left";

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          onClose();
        }
      }}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{
        className: "rounded-[12px] border border-[#E5E5E5] shadow-sm mt-1",
      }}
    >
      <div className="min-w-[180px] py-1">
        <button
          type="button"
          disabled={isFirst || moveDisabled}
          className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none`}
          onClick={() => onMoveUp?.()}
        >
          <ArrowUp size={16} />
          <span>Move up</span>
        </button>
        <button
          type="button"
          disabled={isLast || moveDisabled}
          className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none`}
          onClick={() => onMoveDown?.()}
        >
          <ArrowDown size={16} />
          <span>Move down</span>
        </button>
        <button
          type="button"
          disabled={moveDisabled}
          className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none`}
          onClick={() => onAppendRecording?.()}
        >
          <AudioLines size={16} />
          <span>Append recording</span>
        </button>
        <button
          type="button"
          disabled={moveDisabled}
          className={`${itemClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none`}
          onClick={() => onDelete?.()}
        >
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
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          onClose();
        }
      }}
      disableAutoFocus
      disableEnforceFocus
      disableRestoreFocus
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{
        className: "rounded-[16px] border border-[#E5E5E5] shadow-md",
      }}
    >
      <div className="w-[430px] p-4">
        <div className="flex items-center justify-between">
          <p className="leading-none font-semibold text-[#2A2A2A]">
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

        <p className="text-[#3A3A3A] leading-none">Quickly add a new tag</p>

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

export const SPEAKER_OPTIONS = ["Speaker 1", "Speaker 2"];

export const TranscriptBlockTextEditor = ({
  text,
  disabled,
  saving,
  onCommit,
  className = "",
  autoStartEditing = false,
  emptyPlaceholder = "[Add text here]",
}) => {
  const [editing, setEditing] = useState(() => autoStartEditing);
  const [draft, setDraft] = useState(text ?? "");

  const commit = async () => {
    if (disabled || saving) {
      setEditing(false);
      return;
    }
    const prev = (text ?? "").trim();
    const next = draft.trim();
    if (next === prev) {
      setEditing(false);
      return;
    }
    if (next.length === 0) {
      setDraft(text ?? "");
      setEditing(false);
      await onCommit({ empty: true });
      return;
    }
    const ok = await onCommit({ text: next });
    if (!ok) setDraft(text ?? "");
    setEditing(false);
  };

  if (!editing) {
    const empty = !(text ?? "").trim();
    return (
      <p
        className={`text-sm leading-relaxed text-foreground pl-8 cursor-text wrap-break-word whitespace-pre-wrap ${disabled || saving ? "cursor-not-allowed opacity-60" : ""} ${className}`}
        onClick={() => {
          if (disabled || saving) return;
          setDraft(text ?? "");
          setEditing(true);
        }}
      >
        {empty ? (
          <span className="text-muted-foreground">{emptyPlaceholder}</span>
        ) : (
          text
        )}
      </p>
    );
  }

  const rowCount = Math.min(24, Math.max(3, draft.split("\n").length + 1));

  return (
    <textarea
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(text ?? "");
          setEditing(false);
          return;
        }
        if (e.key === "Enter" && e.shiftKey) return;
        if (e.key === "Enter") {
          if (e.nativeEvent.isComposing) return;
          e.preventDefault();
          commit();
        }
      }}
      disabled={disabled || saving}
      rows={rowCount}
      className="w-full min-h-[4rem] resize-y bg-transparent border-0 p-0 text-sm leading-relaxed text-foreground outline-none focus:outline-none focus:ring-0 focus-visible:outline-none shadow-none ring-0 pl-8 wrap-break-word disabled:opacity-60"
    />
  );
};

export const BlockSpeakerDropdown = ({
  value,
  displayLabel,
  disabled,
  saving,
  onSelect,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClose = () => setAnchorEl(null);

  const handlePick = async (speaker) => {
    handleClose();
    if (disabled || saving) return;
    if (value !== "" && speaker === value) return;
    await onSelect(speaker);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || saving}
        onClick={(e) => !disabled && !saving && setAnchorEl(e.currentTarget)}
        className="flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary transition-colors disabled:opacity-60 disabled:pointer-events-none"
      >
        <span className="truncate max-w-[140px]">{displayLabel || value}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            className: "mt-1 rounded-lg border border-gray-200 shadow-sm",
          },
        }}
      >
        {SPEAKER_OPTIONS.map((opt) => (
          <MenuItem
            key={opt}
            selected={Boolean(value) && opt === value}
            onClick={() => handlePick(opt)}
            className="text-sm"
          >
            {opt}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
