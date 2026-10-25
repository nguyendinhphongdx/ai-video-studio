// Vietnamese voice-over. Default engine: Microsoft Edge TTS (free, no key) via the
// `edge-tts` command (pip install edge-tts). Set AVS_TTS=none to skip voice.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { parseMedia } from "@remotion/media-parser";
import { nodeReader } from "@remotion/media-parser/node";
import { narrationLines } from "./spec.mjs";

const run = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** An error safe to show in the UI: short Vietnamese `message`, full technical text in `detail` (log only). */
export class UserError extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail;
  }
}

const lineName = (key) => (key === "intro" ? "câu mở đầu" : key === "outro" ? "câu kết" : key === "preview" ? "câu nghe thử" : `cảnh ${Number(key) + 1}`);

// Edge TTS is a free online service that throttles bursts of requests: it then answers with no audio
// (NoAudioReceived) for any text for a while. Space requests out and back off long enough to get past it.
const LINE_GAP_MS = 600;
async function synthesizeLine(args, key) {
  const delays = [2000, 5000, 10000, 20000];
  for (let attempt = 1; ; attempt++) {
    try {
      return await run(process.env.AVS_EDGE_TTS || "edge-tts", args);
    } catch (e) {
      const detail = `${e.message}\n${e.stderr ?? ""}`.trim();
      if (attempt > delays.length) {
        const why = /NoAudioReceived/.test(detail) ? "Edge TTS không trả âm thanh" : /ENOENT/.test(detail) ? "không tìm thấy edge-tts" : "Edge TTS bị lỗi";
        throw new UserError(`Không tạo được giọng đọc cho ${lineName(key)}: ${why}. Thử lại hoặc đổi giọng.`, detail);
      }
      console.error(`[tts] ${lineName(key)}: lần ${attempt} lỗi, thử lại sau ${delays[attempt - 1] / 1000}s`);
      await sleep(delays[attempt - 1]);
    }
  }
}

export const VOICES = {
  "vi-VN-HoaiMyNeural": "Hoài My (nữ, miền Bắc)",
  "vi-VN-NamMinhNeural": "Nam Minh (nam, miền Bắc)",
};

export async function ttsAvailable() {
  if (process.env.AVS_TTS === "none") return false;
  try {
    await run(process.env.AVS_EDGE_TTS || "edge-tts", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function audioDuration(file) {
  const { durationInSeconds } = await parseMedia({
    src: file,
    reader: nodeReader,
    fields: { durationInSeconds: true },
    acknowledgeRemotionLicense: true,
  });
  return durationInSeconds ?? 0;
}

export const PREVIEW_DIR = path.resolve(import.meta.dirname, "../data/tts-preview");

/** One line spoken with the given voice, cached by content, so the script can be heard before rendering. */
export async function previewLine(text, voice = "vi-VN-HoaiMyNeural", rate = "-8%") {
  if (!VOICES[voice]) throw new UserError("Giọng đọc không hợp lệ");
  const hash = crypto.createHash("sha1").update(`${voice}|${rate}|${text}`).digest("hex").slice(0, 16);
  const out = path.join(PREVIEW_DIR, `${hash}.mp3`);
  try {
    await fs.access(out);
  } catch {
    await fs.mkdir(PREVIEW_DIR, { recursive: true });
    await synthesizeLine(["--voice", voice, `--rate=${rate}`, "--text", text, "--write-media", out], "preview");
  }
  return `${hash}.mp3`;
}

/**
 * Synthesises one mp3 per narration line into `dir`.
 * Returns { files: {key: absPath}, durations: {key: seconds} }.
 */
export async function synthesize(spec, dir, { voice = "vi-VN-HoaiMyNeural", rate = "-8%", onProgress } = {}) {
  await fs.mkdir(dir, { recursive: true });
  const lines = narrationLines(spec);
  const files = {};
  const durations = {};
  for (const [i, { key, text }] of lines.entries()) {
    if (!text?.trim()) continue;
    const out = path.join(dir, `${key}.mp3`);
    if (i > 0) await sleep(LINE_GAP_MS);
    await synthesizeLine(["--voice", voice, `--rate=${rate}`, "--text", text, "--write-media", out], key);
    files[key] = out;
    durations[key] = await audioDuration(out);
    onProgress?.((i + 1) / lines.length);
  }
  return { files, durations };
}
