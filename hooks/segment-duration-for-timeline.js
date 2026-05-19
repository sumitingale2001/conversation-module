/**
 * Segment length in seconds for cumulative timeline + STATE 3 widths.
 * Must match playback (`use-conversation-playback`) and layout (`static-waveform`).
 *
 * @param {object} seg — conversation segment
 * @param {Record<string, number>} [metaDurationById] — optional HTMLAudioElement metadata from preload
 */
export function segmentDurationSecForTimeline(seg, metaDurationById = {}) {
  if (!seg) return 0.01;
  const id = seg._id != null ? String(seg._id) : "";
  const metaDur = id ? metaDurationById[id] : undefined;
  const st = Number(seg.startTime) || 0;
  let dur = Number(seg.duration);
  if (!Number.isFinite(dur) || dur <= 0) {
    const en =
      seg.endTime != null && seg.endTime !== "" ? Number(seg.endTime) : NaN;
    dur = Number.isFinite(en) && en > st ? en - st : 0;
  }
  if (
    (!Number.isFinite(dur) || dur <= 0) &&
    Number.isFinite(metaDur) &&
    metaDur > 0
  ) {
    dur = metaDur;
  }
  if (dur <= 0) dur = 0.01;
  return dur;
}

export function normalizeTimelineId(id) {
  if (id == null || id === "") return "";
  if (typeof id === "string" || typeof id === "number") return String(id);
  if (typeof id === "object") {
    const raw = id._id ?? id.id ?? id.$oid;
    if (raw != null && typeof raw === "object" && raw.$oid != null) {
      return String(raw.$oid);
    }
    if (raw != null) return String(raw);
    if (id.$oid != null) return String(id.$oid);
  }
  return String(id);
}

function sortedSegments(segments) {
  return [...(segments || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );
}

export function segmentIdFromEntity(entity) {
  const raw = entity?.segmentId ?? entity?._id;
  return normalizeTimelineId(raw);
}

/** Block offset within its segment (ms). Matches `use-conversation-playback`. */
export function blockStartMs(block) {
  if (block?.startTimeMs != null && block?.startTimeMs !== "") {
    const n = Number(block.startTimeMs);
    if (!Number.isNaN(n)) return n;
  }
  if (block?.startTime != null && block?.startTime !== "") {
    const n = Number(block.startTime);
    if (!Number.isNaN(n)) return n * 1000;
  }
  return 0;
}

/** Cumulative timeline start for a segment (STATE 3 / playback). */
export function timelineStartForSegment(
  segments,
  segId,
  segmentMetaDurationById = {},
) {
  const list = sortedSegments(segments);
  let acc = 0;
  const want = normalizeTimelineId(segId);
  for (const s of list) {
    if (normalizeTimelineId(s._id) === want) {
      const stRaw = Number(s.startTime);
      return Number.isFinite(stRaw) && stRaw >= acc ? stRaw : acc;
    }
    const stRaw = Number(s.startTime);
    const timelineStart =
      Number.isFinite(stRaw) && stRaw >= acc ? stRaw : acc;
    const dur = segmentDurationSecForTimeline(s, segmentMetaDurationById);
    acc = timelineStart + dur;
  }
  return 0;
}

/** Global timeline position (seconds) for a transcript block bookmark. */
export function globalTimestampSecForBlock(
  block,
  segments,
  segmentMetaDurationById = {},
) {
  const segId = segmentIdFromEntity(block);
  if (!segId) return null;
  const timelineStart = timelineStartForSegment(
    segments,
    segId,
    segmentMetaDurationById,
  );
  return timelineStart + blockStartMs(block) / 1000;
}

/** Seconds from the start of the block's owning segment (for waveform chip placement). */
export function segmentRelativeSecForBlock(block) {
  return blockStartMs(block) / 1000;
}
