/**
 * Transcript vs playback — product contract:
 * - Playback uses RecordingSegment audio only (immutable recording).
 * - Block text is an editable layer for readability; it does not alter audio.
 *
 * Future: optional TTS mode would swap playback source in a dedicated layer
 * (see PLAYBACK_SOURCE.TTS) — do not fake-sync edited text with waveform/audio here.
 */

export const PLAYBACK_SOURCE = Object.freeze({
  /** Current production: segment fileUrl + block time window */
  SEGMENT_AUDIO: "segment_audio",
  /** Reserved for a separate TTS pipeline / UI mode */
  TTS: "tts",
});

/**
 * Best-effort detection of user-edited transcript text for UX badges.
 * Extend when API adds explicit flags or stable originals.
 */
export function isBlockTextUserEdited(block) {
  if (!block) return false;
  if (block.isEdited === true || block.userEdited === true) return true;
  if (block.textEditedAt != null || block.editedAt != null) return true;
  const orig = block.originalText ?? block.asrText ?? block.sourceText;
  if (typeof orig === "string" && typeof block.text === "string" && orig !== block.text) {
    return true;
  }
  return false;
}
