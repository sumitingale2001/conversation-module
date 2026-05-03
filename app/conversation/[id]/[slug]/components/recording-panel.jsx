"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Diamond,
  Mic,
  Play,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import useConversationStore from "../../../../../store/conversation.store";
import { useRecordingStore } from "../../../../../store/recording.store";
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
  handleReset,
  handleConfirm,
  pendingName,
  onPendingNameChange,
}) => {
  const { conversation } = useConversationStore();
  const {
    isPaused,
    isRecording,
    duration,
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverContainerRef = useRef(null);

  const isProcessing = conversation?.status === "processing";
  const isMicSelectorDisabled =
    isProcessing || isSwitchingInput || devicePermissionDenied;

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
    if (isMicSelectorDisabled && isPopoverOpen) {
      setIsPopoverOpen(false);
    }
  }, [isMicSelectorDisabled, isPopoverOpen]);

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

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl bg-white shadow-md ring-1 ring-gray-200">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex-1 text-center text-lg font-semibold tabular-nums text-gray-900">
          {formatTimer(duration)}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-900 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1C1C92] text-white hover:bg-[#1C1C92] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="px-5 pb-2">
        <div className="relative overflow-visible rounded-lg">
          <StaticWaveform
            mediaStream={mediaStream}
            pendingName={pendingName}
            onPendingNameChange={onPendingNameChange}
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-5 pb-2 pt-1">
        <button
          className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-900 disabled:opacity-50"
          disabled={isProcessing}
        >
          1x <ChevronDown className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-3">
          <button
            className="relative text-gray-500 disabled:opacity-50"
            disabled={isProcessing}
          >
            <RotateCw className="h-5 w-5 -scale-x-100" />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold">
              5
            </span>
          </button>
          <button
            className={`flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-50 transition-colors ${isPaused ? "bg-[#1C1C92] text-white" : "border border-gray-300 text-gray-600"}`}
            disabled={isProcessing}
          >
            <Play className="h-5 w-5 fill-current" />
          </button>
          <button
            className="relative text-gray-500 disabled:opacity-50"
            disabled={isProcessing}
          >
            <RotateCw className="h-5 w-5" />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold">
              5
            </span>
          </button>
        </div>
        <button
          className="text-blue-600 disabled:opacity-50"
          disabled={isProcessing}
        >
          <Diamond className="text-blue-600 h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex items-center justify-between px-5 pb-4 pt-2">
        <div className="relative" ref={popoverContainerRef}>
          <button
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
        <button
          onClick={handlePauseToggle}
          disabled={isProcessing}
          className={`rounded-md px-8 py-1.5 text-sm font-medium disabled:opacity-50 transition-colors ${isPaused ? "bg-[#1C1C92] text-white" : "border border-gray-300 text-gray-900 hover:bg-gray-50"}`}
        >
          {isProcessing ? "Processing..." : isPaused ? "Resume" : "Pause"}
        </button>
        <span className="w-12" />
      </div>
    </div>
  );
};

export default RecordingPanel;
