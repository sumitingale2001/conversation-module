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
