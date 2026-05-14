"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Diamond,
  Mic,
  Pause,
  Play,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import useConversationStore from "@/store/conversation.store";
import { useRecordingStore } from "@/store/recording.store";
import { useConversationPlayback } from "@/hooks/use-conversation-playback";
import StaticWaveform from "./static-waveform";

const formatTimer = (seconds) => {
  if (!seconds) return "00:00:00";
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const RecordingPanel = ({
  slug,
  onRestartConfirm,
  handleConfirm,
  pendingName,
  onPendingNameChange,
  handleDiamondClick,
}) => {
  const conversation = useConversationStore((s) => s.conversation);
  const timelineSegments = useConversationStore((s) => s.segments);
  const convPlaybackTime = useConversationStore((s) => s.currentTime);
  const convIsPlaying = useConversationStore((s) => s.isPlaying);
  const playbackRate = useConversationStore((s) => s.playbackRate) ?? 1;
  const setPlaybackState = useConversationStore((s) => s.setPlaybackState);
  const {
    isPaused,
    isRecording,
    duration,
    markers,
    availableDevices,
    selectedDeviceId,
    devicePermissionDenied,
    isSwitchingInput,
    pauseRecording,
    resumeRecording,
    loadDevices,
    setDevice,
    restartRecordingWithDevice,
    mediaStream,
  } = useRecordingStore();
  const {
    togglePlayPause,
    skipBack,
    skipForward,
    stopPlayback,
    seekToGlobalTime,
    scrubPlaybackUiTo,
  } = useConversationPlayback();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [speedPopoverOpen, setSpeedPopoverOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const popoverContainerRef = useRef(null);
  const speedPopoverRef = useRef(null);

  const isProcessing = conversation?.status === "processing";
  const isMicSelectorDisabled =
    isProcessing || isSwitchingInput || devicePermissionDenied;

  /** Recording: live timer. Idle: total length until playback moves the head (then show position). */
  const totalDur = Number(conversation?.totalDuration) || 0;
  const hasPlayableSegments =
    timelineSegments?.some?.((s) => Boolean(s.fileUrl)) ?? false;
  const playbackControlsDisabled =
    isProcessing || isRecording || !hasPlayableSegments;
  const displaySeconds = isRecording
    ? duration
    : convIsPlaying || convPlaybackTime > 0
      ? convPlaybackTime
      : totalDur;

  const handlePauseToggle = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (isRecording) stopPlayback();
  }, [isRecording, stopPlayback]);

  useEffect(() => {
    if (!navigator?.mediaDevices?.addEventListener) return;

    const handleDeviceRefresh = () => {
      loadDevices();
    };

    navigator.mediaDevices.addEventListener(
      "devicechange",
      handleDeviceRefresh,
    );
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceRefresh,
      );
    };
  }, [loadDevices]);

  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleOutsideClick = (event) => {
      if (!popoverContainerRef.current?.contains(event.target)) {
        setIsPopoverOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsPopoverOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isPopoverOpen]);

  useEffect(() => {
    if (!speedPopoverOpen) return;

    const handleOutsideClick = (event) => {
      if (!speedPopoverRef.current?.contains(event.target)) {
        setSpeedPopoverOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setSpeedPopoverOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [speedPopoverOpen]);

  useEffect(() => {
    if (isMicSelectorDisabled && isPopoverOpen) {
      setIsPopoverOpen(false);
    }
  }, [isMicSelectorDisabled, isPopoverOpen]);

  useEffect(() => {
    if (!restartDialogOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setRestartDialogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restartDialogOpen]);

  const handleRestartDialogConfirm = async () => {
    setRestartDialogOpen(false);
    await onRestartConfirm?.();
  };

  const getDeviceLabel = (device, index) => {
    if (device.deviceId === "default") return "Default - Input source";
    if (device.label?.trim()) return device.label;
    return `Input source ${index + 1}`;
  };

  const handleDeviceChange = async (deviceId) => {
    if (isMicSelectorDisabled || !deviceId) return;

    try {
      if (isRecording) {
        await restartRecordingWithDevice(deviceId);
      } else {
        setDevice(deviceId);
      }
    } finally {
      setIsPopoverOpen(false);
    }
  };

  useEffect(() => {
    if (!isRecording) setIsPopoverOpen(false);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) setSpeedPopoverOpen(false);
  }, [isRecording]);

  useEffect(() => {
    if (playbackControlsDisabled) setSpeedPopoverOpen(false);
  }, [playbackControlsDisabled]);

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl bg-white shadow-md ring-1 ring-gray-200">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-3">
        <div className="justify-self-start">
          {isRecording && (
            <button
              type="button"
              onClick={() => setRestartDialogOpen(true)}
              disabled={isProcessing}
              aria-label="Restart conversation"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-900 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="text-center text-lg font-semibold tabular-nums text-gray-900">
          {formatTimer(displaySeconds)}
        </div>
        <div className="justify-self-end">
          {isRecording && (
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              aria-label="Save recording"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1C1C92] text-white hover:bg-[#1C1C92] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div className="pb-2">
        <div className="relative overflow-hidden rounded-lg">
          <StaticWaveform
            mediaStream={mediaStream}
            pendingName={pendingName}
            onPendingNameChange={onPendingNameChange}
            playbackScrubTo={scrubPlaybackUiTo}
            playbackSeekCommit={seekToGlobalTime}
            playbackPause={stopPlayback}
          />
        </div>
      </div>

      <div
        className={`flex items-center justify-between px-5 pt-1 ${isRecording ? "pb-2" : "pb-5"}`}
      >
        <div className="relative justify-self-start" ref={speedPopoverRef}>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-900 disabled:opacity-50 cursor-pointer"
            disabled={playbackControlsDisabled}
            aria-expanded={speedPopoverOpen}
            aria-label="Playback speed"
            onClick={() => setSpeedPopoverOpen((o) => !o)}
          >
            {playbackRate >= 2 ? "2x" : "1x"}{" "}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${speedPopoverOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className={`absolute bottom-full left-0 z-50 mb-2 min-w-[88px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg transition-all duration-150 ${
              speedPopoverOpen && !playbackControlsDisabled
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none translate-y-1 opacity-0"
            }`}
          >
            {[1, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                className={`flex w-full items-center px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-gray-100 cursor-pointer ${
                  Math.abs(playbackRate - rate) < 0.01
                    ? "bg-[#EFEEFC] font-semibold text-[#1C1C92]"
                    : "text-gray-900"
                }`}
                onClick={() => {
                  setPlaybackState({ playbackRate: rate });
                  setSpeedPopoverOpen(false);
                }}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative text-gray-500 disabled:opacity-50 cursor-pointer"
            disabled={playbackControlsDisabled}
            onClick={() => skipBack()}
            aria-label="Back 5 seconds"
          >
            <RotateCw className="h-5 w-5 -scale-x-100" />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold">
              5
            </span>
          </button>
          <button
            type="button"
            className={`flex h-9 bg-[#1C1C92] text-white cursor-pointer w-9 items-center justify-center rounded-full disabled:opacity-50 transition-colors ${
              !isRecording && convIsPlaying
                ? "bg-[#1C1C92] text-white"
                : "border border-gray-300 text-gray-600"
            }`}
            disabled={playbackControlsDisabled}
            onClick={() => togglePlayPause()}
            aria-label={
              !isRecording && convIsPlaying ? "Pause playback" : "Play"
            }
          >
            {!isRecording && convIsPlaying ? (
              <>
                <Pause className="h-5 w-5 fill-current" />
              </>
            ) : (
              <Play className="h-5 w-5 fill-current! pl-0.5" />
            )}
          </button>
          <button
            type="button"
            className="relative text-gray-500 disabled:opacity-50 cursor-pointer"
            disabled={playbackControlsDisabled}
            onClick={() => skipForward()}
            aria-label="Forward 5 seconds"
          >
            <RotateCw className="h-5 w-5" />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold">
              5
            </span>
          </button>
        </div>
        <button
          type="button"
          className={`${
            markers.length > 0
              ? "text-green-500 disabled:opacity-50"
              : "text-blue-600 disabled:opacity-50"
          } ${isRecording && isPaused ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
          disabled={isProcessing || !isRecording}
          title="Add bookmark and pause recording"
          onClick={() => void handleDiamondClick?.()}
        >
          <Diamond
            className={`h-5 w-5 ${markers.length > 0 ? "fill-green-500 text-green-500" : "text-blue-600"}`}
            strokeWidth={1.75}
          />
        </button>
      </div>

      {isRecording && (
        <div className="flex items-center justify-between px-5 pb-4 pt-2">
          <div className="relative" ref={popoverContainerRef}>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs disabled:opacity-50"
              disabled={isMicSelectorDisabled}
              onClick={() => setIsPopoverOpen((prev) => !prev)}
            >
              <Mic className="h-3.5 w-3.5 cursor-pointer" />
              <ChevronDown
                className={`h-3 w-3 transition-transform ${isPopoverOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div
              className={`absolute bottom-full left-0 mb-2 w-[220px] origin-bottom-left rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg transition-all duration-150 ${isPopoverOpen && !isMicSelectorDisabled ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"}`}
            >
              {availableDevices.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  {devicePermissionDenied
                    ? "Microphone permission denied"
                    : "No input devices available"}
                </div>
              ) : (
                availableDevices.map((device, index) => {
                  const isSelected = device.deviceId === selectedDeviceId;

                  return (
                    <button
                      key={device.deviceId || `audio-${index}`}
                      type="button"
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[12px] leading-[16px] text-gray-900 transition-colors hover:bg-gray-100 cursor-pointer ${isSelected ? "bg-[#EFEEFC] font-semibold" : ""}`}
                      onClick={() => handleDeviceChange(device.deviceId)}
                      disabled={isMicSelectorDisabled}
                    >
                      {getDeviceLabel(device, index)}
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => {
                if (isProcessing) return;
                handlePauseToggle();
              }}
              disabled={isProcessing}
              className={`rounded-md px-8 py-1.5 text-sm font-medium disabled:opacity-50 transition-colors ${
                isProcessing
                  ? "border border-gray-200 text-gray-500"
                  : isPaused
                    ? "bg-[#1C1C92] text-white"
                    : "border border-gray-300 text-gray-900 hover:bg-gray-50"
              }`}
            >
              {isProcessing ? "Processing..." : isPaused ? "Resume" : "Pause"}
            </button>
          </div>
          <span className="w-12" />
        </div>
      )}

      {restartDialogOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-start justify-center px-4 pt-[63px] opacity-100">
            <div
              className="absolute inset-0 bg-black/40"
              aria-hidden
              onClick={() => setRestartDialogOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="restart-conversation-title"
              className="relative z-10 flex min-h-[178px] w-[370px] max-w-full flex-col gap-6 rounded-[8px] border border-gray-200 bg-white p-[15px] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-2">
                <h2
                  id="restart-conversation-title"
                  className="text-base font-bold leading-snug text-gray-900"
                >
                  Are you sure you wish to restart this conversation?
                </h2>
                <p className="text-sm leading-relaxed text-gray-500">
                  {slug === "instant" ? (
                    <>
                      Confirming will permanently delete the conversation and
                      start the recording from scratch. This action cannot be
                      undone.
                    </>
                  ) : (
                    <>
                      This will discard the current recording session and clear
                      the timer. Unsaved audio will be lost.
                    </>
                  )}
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setRestartDialogOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleRestartDialogConfirm()}
                  className="flex-1 rounded-lg bg-[#1C1C92] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#16166e]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default RecordingPanel;
