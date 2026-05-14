"use client"
import useCreateConversation from "../../../hooks/use-create-conversation";
import { Menu, MenuItem } from "@mui/material"
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { conversationServices } from "../../../services/conversationServices";
import apiInstance from "../../../config/apiInstance";
import { userId, workspaceId } from "../../../utils/conversation.utils";

const menuItemSx = {
    fontWeight: 400, fontSize: "12px", lineHeight: "16px", padding: "1rem", gap: 1, height: "22px", borderRadius: "8px", hover: {
        backgroundColor: "red",
    }
};

/** When `File.type` is missing (common for multi-select / OS), allow known extensions. */
const AUDIO_FILE_EXTENSION = /\.(mp3|wav|m4a|aac|flac|ogg|opus|webm|wma|aiff?|caf)$/i;

function isLikelyAudioFile(file) {
    if (!file) return false;
    if (file.type?.startsWith("audio/")) return true;
    if (file.type) return false;
    return AUDIO_FILE_EXTENSION.test(file.name || "");
}


const Add = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [isUploadingSource, setIsUploadingSource] = useState(false);
    const open = Boolean(anchorEl);
    const fileInputRef = useRef(null);
    const router = useRouter()

    const { handleCreateConversation, loading } = useCreateConversation()

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAddSourceClick = () => {
        if (isUploadingSource) return;
        handleClose();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleInstantRecord = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());

            handleCreateConversation({
                userId: "68189687b95b90b6f3996e75",
                workspaceId: "681896a0b95b90b6f3996ed7",
                sourceType: 'instant'
            });
        } catch (error) {
            console.error("Microphone permission denied:", error);
        } finally {
            handleClose();
        }
    }

    const handleSourceFilesUpload = async (files) => {
        if (isUploadingSource) return;
        const audioFiles = Array.from(files || []).filter(isLikelyAudioFile);
        if (audioFiles.length === 0) return;

        setIsUploadingSource(true);

        try {
            const createRes = await conversationServices.createConversation({
                userId,
                workspaceId,
                sourceType: "upload",
            });
            if (!createRes?.success || !createRes?.data?._id) {
                throw new Error(createRes?.error || "Failed to create conversation.");
            }

            const conversationId = createRes.data._id;

            for (const file of audioFiles) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("conversationId", conversationId);
                formData.append("workspaceId", workspaceId);

                const uploadRes = await apiInstance.post("/uploads/audio", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                if (!uploadRes?.data?.success || !uploadRes?.data?.fileUrl) {
                    throw new Error("Upload failed.");
                }

                const appendRes = await conversationServices.appendSegment({
                    conversationId,
                    workspaceId,
                    fileUrl: uploadRes.data.fileUrl,
                    duration: 0,
                    startTime: 0,
                    endTime: 0,
                });

                if (!appendRes?.success) {
                    throw new Error(appendRes?.error || "Failed to append segment.");
                }
            }

            router.push(`/conversation/${conversationId}/upload`);
        } catch (error) {
            console.error("[SearchAndCreate] Upload source flow failed:", error);
        } finally {
            setIsUploadingSource(false);
        }
    };

    const handleFileSelect = async (event) => {
        const selected = event.target.files;
        if (!selected?.length) return;

        // Snapshot File objects before clearing the input — resetting `value` clears
        // the live FileList in browsers, which would skip the upload flow.
        const audioFiles = Array.from(selected).filter(isLikelyAudioFile);
        event.target.value = "";

        if (audioFiles.length === 0) return;

        await handleSourceFilesUpload(audioFiles);
    };

    return (
        <>
            <button
                onClick={handleClick}
                className="h-[30px] w-[30px] cursor-pointer border border-[#47BB17] bg-[#47BB17] flex items-center justify-center rounded-[8px]"
            >
                <Image src="/control-add.svg" width={16} height={16} alt="add" />
            </button>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: "8px",
                            padding: "10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                            minWidth: 188,
                            boxShadow: "0px 4px 16px rgba(0,0,0,0.12)",
                        },
                    },
                }}
                // Align the dropdown to the bottom-right of the trigger button
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
                <MenuItem disabled={loading || isUploadingSource} sx={menuItemSx} onClick={handleInstantRecord}>
                    <Image loading="eager" src="/mic.svg" alt="mic" width={16} height={16} />
                    Instant record
                </MenuItem>
                <MenuItem disabled={loading || isUploadingSource} sx={menuItemSx} onClick={handleAddSourceClick}>
                    <Image loading="eager" src="/interaction-file.svg" alt="mic" width={16} height={16} />
                    {isUploadingSource ? "Uploading..." : "Add Source & transcribe"}
                </MenuItem>
            </Menu>
            <input
                type="file"
                accept="audio/*"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: "none" }}
            />
        </>
    );
};

const SearchAndCreate = () => {
    return (
        <div className="flex justify-between items-center mt-[50px]">
            <p className="font-bold text-[20px] leading-[32px]">Converse</p>
            <div className="flex items-center gap-1">
                <button className="h-[30px] w-[30px] cursor-pointer border border-black flex items-center justify-center rounded-[8px]">
                    <Image src="/search-icon.svg" width={16} height={16} alt="search" />
                </button>
                <Add />
            </div>
        </div>
    );
};

export default SearchAndCreate;