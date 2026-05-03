/**
 * Maps recording waveform bookmarks to transcript blocks and attaches tags via
 * PUT /transcript/block/add-tag (requires global tag id from create-tag flow).
 */

import { conversationServices } from "./conversationServices";
import { useRecordingStore } from "../store/recording.store";

function transcriptFromPayload(payload) {
  if (!payload) return null;
  if (payload.transcript?._id) return payload.transcript;
  if (payload.success && payload.data?.transcript?._id)
    return payload.data.transcript;
  if (payload.data?.transcript?._id) return payload.data.transcript;
  if (payload.data?._id && Array.isArray(payload.data.blocks)) return payload.data;
  return null;
}

/**
 * GET /transcript — normalize axios body shapes.
 */
async function fetchTranscriptDocument(conversationId, workspaceId) {
  const raw = await conversationServices.ensureTranscript({
    conversationId,
    workspaceId,
  });
  return transcriptFromPayload(raw);
}

/**
 * Attach bookmark tags to transcript blocks for one segment.
 * Tags must exist globally (create-tag); backend maps global tagId → transcript tag entry.
 *
 * @returns {{ success: boolean, deferred?: boolean, reason?: string }}
 */
export async function syncBookmarksToTranscriptBlocks({
  conversationId,
  workspaceId,
  userId,
  segmentId,
  markers,
}) {
  const withTags = (markers || []).filter((m) => (m.tags?.length ?? 0) > 0);
  if (!withTags.length || !segmentId || !conversationId || !workspaceId || !userId) {
    return { success: true, skipped: true };
  }

  const transcript = await fetchTranscriptDocument(conversationId, workspaceId);

  if (!transcript?._id) {
    return {
      success: false,
      deferred: true,
      reason: "no_transcript",
    };
  }

  if (transcript.status !== "completed") {
    return {
      success: false,
      deferred: true,
      reason: "transcript_not_completed",
    };
  }

  const blocksInSegment = (transcript.blocks || []).filter(
    (b) =>
      b.segmentId?.toString() === segmentId?.toString() &&
      b.isDeleted !== true &&
      b.isActive !== false,
  );

  if (!blocksInSegment.length) {
    return {
      success: false,
      deferred: true,
      reason: "no_blocks",
    };
  }

  const findBlockForMarker = (relSec) => {
    const relMs = Math.max(0, (Number(relSec) || 0) * 1000);
    const overlapping = blocksInSegment.find((b) => {
      const start = Number(b.startTimeMs);
      const end = Number(b.endTimeMs);
      if (!Number.isFinite(start)) return false;
      const endOk = Number.isFinite(end) ? end : start;
      return relMs >= start && relMs <= endOk;
    });
    if (overlapping) return overlapping;
    return blocksInSegment[0];
  };

  for (const m of withTags) {
    const block = findBlockForMarker(m.timestamp);
    if (!block?._id) continue;

    for (const tag of m.tags || []) {
      const label =
        typeof tag?.label === "string"
          ? tag.label
          : typeof tag === "string"
            ? tag
            : "";
      const normalized = (label || "").trim();
      if (!normalized) continue;

      const selectedTag = await conversationServices.ensureUserTagByName(
        userId,
        normalized,
      );
      if (!selectedTag?._id) continue;

      await conversationServices.addTagToBlock({
        transcriptId: transcript._id.toString(),
        workspaceId,
        blockId: block._id.toString(),
        tagId: selectedTag._id.toString(),
      });
    }
  }

  return { success: true };
}

export function setPendingBookmarkSync(segmentId, markers) {
  if (!segmentId || !markers?.length) return;
  useRecordingStore.getState().setPendingBookmarkSync(segmentId, markers);
}

export function clearPendingBookmarkSync(segmentId) {
  useRecordingStore.getState().clearPendingBookmarkSync(segmentId);
}

/**
 * Retry applying bookmarks after transcription produces blocks.
 */
export async function flushPendingBookmarkSyncForSegment({
  segmentId,
  conversationId,
  workspaceId,
  userId,
}) {
  const pending =
    useRecordingStore.getState().pendingBookmarkSyncBySegment?.[segmentId];
  if (!pending?.length) return { success: true, skipped: true };

  const result = await syncBookmarksToTranscriptBlocks({
    conversationId,
    workspaceId,
    userId,
    segmentId,
    markers: pending,
  });

  if (result.success && !result.deferred) {
    useRecordingStore.getState().clearPendingBookmarkSync(segmentId);
  }

  return result;
}
