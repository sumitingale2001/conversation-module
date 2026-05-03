'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Checkbox, IconButton } from '@mui/material';
import { X, GripVertical, Trash2, PenLine, Check } from 'lucide-react';
import { TAG_COLOR_PALETTE } from './tag-palette';

/** Figma: 248×264, radius 8; swatches 16×16, gap 10 between swatches */
const GAP = 10;
const SWATCH = 16;

/**
 * Positioning + shell match `recording-panel.jsx` restart dialog:
 * createPortal → fixed inset-0 → flex items-start justify-center px-4 pt-[63px] → backdrop → dialog card.
 */
const ManageTagsModal = ({
    open,
    onClose,
    tags,
    onAddTag,
    onUpdateTag,
    onDeleteTag,
    onReorder,
    onToggleQuickBar,
}) => {
    const [newName, setNewName] = useState('');
    const [selectedColor, setSelectedColor] = useState(TAG_COLOR_PALETTE[0]);
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState('');
    const [dragId, setDragId] = useState(null);

    const sorted = useMemo(
        () => [...(tags || [])].sort((a, b) => a.order - b.order),
        [tags],
    );

    const addTrimmed = newName.trim();
    const canAdd = addTrimmed.length > 0;
    const isAddNameDuplicate =
        canAdd &&
        sorted.some(
            (t) =>
                t.name.trim().toLowerCase() === addTrimmed.toLowerCase(),
        );

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) {
            setNewName('');
            setEditingId(null);
            setEditDraft('');
        }
    }, [open]);

    const handleAdd = () => {
        if (!canAdd || isAddNameDuplicate) return;
        onAddTag?.({ name: addTrimmed, colorHex: selectedColor });
        setNewName('');
        const idx = TAG_COLOR_PALETTE.indexOf(selectedColor);
        setSelectedColor(TAG_COLOR_PALETTE[(idx + 1) % TAG_COLOR_PALETTE.length]);
    };

    const commitEdit = (id) => {
        const t = editDraft.trim();
        if (!t) {
            setEditingId(null);
            setEditDraft('');
            return;
        }
        const renameDuplicate = sorted.some(
            (x) =>
                x.id !== id &&
                x.name.trim().toLowerCase() === t.toLowerCase(),
        );
        if (renameDuplicate) return;
        onUpdateTag?.(id, { name: t });
        setEditingId(null);
        setEditDraft('');
    };

    const onDropOn = (targetId) => {
        if (dragId == null || dragId === targetId) {
            setDragId(null);
            return;
        }
        const order = sorted.map((t) => t.id);
        const from = order.indexOf(dragId);
        const to = order.indexOf(targetId);
        if (from < 0 || to < 0) {
            setDragId(null);
            return;
        }
        const next = [...order];
        next.splice(from, 1);
        next.splice(to, 0, dragId);
        onReorder?.(next);
        setDragId(null);
    };

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-start justify-center px-4 pt-[63px] opacity-100">
            <div
                className="absolute inset-0 bg-black/40"
                aria-hidden
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="manage-tags-title"
                className="relative z-10 box-border flex h-[264px] w-[248px] max-w-full flex-col gap-[10px] overflow-hidden rounded-[8px] border border-gray-200 bg-white p-[15px] shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-2">
                    <span
                        id="manage-tags-title"
                        className="text-[14px] font-semibold leading-none text-[#2A2A2A]"
                    >
                        Manage Tags
                    </span>
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#666] hover:bg-gray-100"
                    >
                        <X className="h-[18px] w-[18px]" strokeWidth={2} />
                    </button>
                </div>

                {/* Input + confirm */}
                <div className="min-w-0 shrink-0">
                    <div className="flex min-w-0 items-center gap-[10px]">
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Add tag name"
                            aria-invalid={isAddNameDuplicate}
                            className={`min-w-0 flex-1 rounded-lg border px-2 text-[13px] text-[#444] outline-none placeholder:text-[#B2B2B2] ${
                                isAddNameDuplicate
                                    ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                                    : 'border-[#D4D4D4]'
                            }`}
                            style={{ height: 32, boxSizing: 'border-box', maxWidth: '100%' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && canAdd && !isAddNameDuplicate)
                                    handleAdd();
                            }}
                        />
                        <button
                            type="button"
                            disabled={!canAdd || isAddNameDuplicate}
                            onClick={handleAdd}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DCDCDC] text-white disabled:opacity-40"
                        >
                            <Check className="h-[18px] w-[18px]" />
                        </button>
                    </div>
                    {isAddNameDuplicate && (
                        <p
                            className="mt-1 text-[11px] leading-tight text-red-600"
                            role="alert"
                        >
                            Name already in use
                        </p>
                    )}
                </div>

                {/* Color swatches 16×16, gap 10 — wrap inside panel to avoid horizontal scroll */}
                <div
                    className="flex min-w-0 shrink-0 flex-wrap content-start items-center"
                    style={{ gap: GAP }}
                >
                    {TAG_COLOR_PALETTE.map((hex) => (
                        <button
                            key={hex}
                            type="button"
                            title={hex}
                            onClick={() => setSelectedColor(hex)}
                            className={`shrink-0 rounded-sm border-2 p-0 transition-opacity hover:opacity-90 ${
                                selectedColor === hex
                                    ? 'border-[#1C1C92]'
                                    : 'border-transparent'
                            }`}
                            style={{
                                width: SWATCH,
                                height: SWATCH,
                                backgroundColor: hex,
                                boxSizing: 'border-box',
                            }}
                        />
                    ))}
                </div>

                {/* Tag list */}
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                    <div className="flex flex-col gap-1">
                        {sorted.map((tag) => {
                            const renameDuplicate =
                                editingId === tag.id &&
                                editDraft.trim().length > 0 &&
                                sorted.some(
                                    (x) =>
                                        x.id !== tag.id &&
                                        x.name.trim().toLowerCase() ===
                                            editDraft.trim().toLowerCase(),
                                );
                            return (
                            <div key={tag.id} className="flex min-w-0 flex-col">
                            <div
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDragId(tag.id);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                }}
                                onDrop={() => onDropOn(tag.id)}
                                className="flex min-w-0 items-center rounded-md py-0.5 hover:bg-[#F8F8F8]"
                                style={{ gap: 6 }}
                            >
                                <span className="cursor-grab shrink-0 text-[#AAA] active:cursor-grabbing">
                                    <GripVertical className="h-3.5 w-3.5" />
                                </span>
                                <Checkbox
                                    size="small"
                                    checked={Boolean(tag.showInQuickBar)}
                                    onChange={() => onToggleQuickBar?.(tag.id)}
                                    sx={{ p: '2px' }}
                                />
                                <span
                                    className="inline-flex min-w-0 flex-1 items-center truncate rounded-full border border-black/10 px-2 py-0.5 text-[11px] font-medium text-[#262626]"
                                    style={{
                                        backgroundColor: tag.colorHex,
                                        maxWidth: 'min(108px, 100%)',
                                    }}
                                >
                                    {editingId === tag.id ? (
                                        <input
                                            autoFocus
                                            className="w-full min-w-0 bg-transparent text-[11px] outline-none"
                                            value={editDraft}
                                            onChange={(e) => setEditDraft(e.target.value)}
                                            onBlur={() => commitEdit(tag.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    if (!renameDuplicate)
                                                        commitEdit(tag.id);
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingId(null);
                                                    setEditDraft('');
                                                }
                                            }}
                                        />
                                    ) : (
                                        tag.name
                                    )}
                                </span>
                                <div className="ml-auto flex shrink-0 items-center">
                                    <IconButton
                                        type="button"
                                        size="small"
                                        aria-label="Rename tag"
                                        sx={{ p: '2px' }}
                                        onClick={() => {
                                            setEditingId(tag.id);
                                            setEditDraft(tag.name);
                                        }}
                                    >
                                        <PenLine className="h-3.5 w-3.5 text-[#666]" />
                                    </IconButton>
                                    <IconButton
                                        type="button"
                                        size="small"
                                        aria-label="Delete tag"
                                        sx={{ p: '2px' }}
                                        onClick={() => onDeleteTag?.(tag.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-[#999]" />
                                    </IconButton>
                                </div>
                            </div>
                            {renameDuplicate && (
                                <p
                                    className="mt-0.5 pl-7 text-[10px] leading-tight text-red-600"
                                    role="alert"
                                >
                                    Name already in use
                                </p>
                            )}
                            </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default ManageTagsModal;
