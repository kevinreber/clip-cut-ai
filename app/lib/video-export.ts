import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
};

export type ExportProgress = {
  stage: "loading" | "processing" | "stitching" | "done" | "error";
  percent: number;
  message: string;
};

type Segment = { start: number; end: number };

export function computeKeptSegments(
  transcript: TranscriptWord[],
  videoDuration: number
): Segment[] {
  const segments: Segment[] = [];
  let segStart: number | null = null;

  for (const word of transcript) {
    if (word.isDeleted) {
      if (segStart !== null) {
        segments.push({ start: segStart, end: word.start });
        segStart = null;
      }
    } else {
      if (segStart === null) {
        segStart = word.start;
      }
    }
  }

  // Close final segment
  if (segStart !== null) {
    segments.push({ start: segStart, end: videoDuration });
  }

  // Merge segments that are very close together (< 0.05s gap)
  const merged: Segment[] = [];
  for (const seg of segments) {
    if (seg.end - seg.start < 0.01) continue; // skip tiny segments
    const last = merged[merged.length - 1];
    if (last && seg.start - last.end < 0.05) {
      last.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }

  return merged;
}

export type ExportQuality = "fast" | "balanced" | "high";

const QUALITY_PRESETS: Record<ExportQuality, { preset: string; crf: string }> = {
  fast: { preset: "ultrafast", crf: "28" },
  balanced: { preset: "medium", crf: "23" },
  high: { preset: "slow", crf: "18" },
};

export async function exportVideo(
  videoUrl: string,
  transcript: TranscriptWord[],
  videoDuration: number,
  onProgress: (progress: ExportProgress) => void,
  quality: ExportQuality = "fast"
): Promise<Blob> {
  const segments = computeKeptSegments(transcript, videoDuration);

  if (segments.length === 0) {
    throw new Error("No segments to export - all content has been deleted.");
  }

  onProgress({ stage: "loading", percent: 0, message: "Loading FFmpeg..." });

  const ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    onProgress({
      stage: "processing",
      percent: Math.round(progress * 90) + 5,
      message: `Processing video... ${Math.round(progress * 100)}%`,
    });
  });

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  onProgress({
    stage: "processing",
    percent: 5,
    message: "Loading video file...",
  });

  const videoData = await fetchFile(videoUrl);
  await ffmpeg.writeFile("input.mp4", videoData);

  const { preset, crf } = QUALITY_PRESETS[quality];

  // Build a concat filter for the segments
  if (segments.length === 1) {
    // Simple trim
    const seg = segments[0];
    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-ss",
      seg.start.toFixed(3),
      "-to",
      seg.end.toFixed(3),
      "-c:v",
      "libx264",
      "-preset",
      preset,
      "-crf",
      crf,
      "-c:a",
      "aac",
      "-avoid_negative_ts",
      "make_zero",
      "output.mp4",
    ]);
  } else {
    // Use concat demuxer: trim each segment then concatenate
    // Write individual segment files
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      onProgress({
        stage: "processing",
        percent: 5 + Math.round((i / segments.length) * 70),
        message: `Trimming segment ${i + 1} of ${segments.length}...`,
      });
      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-ss",
        seg.start.toFixed(3),
        "-to",
        seg.end.toFixed(3),
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        crf,
        "-c:a",
        "aac",
        "-avoid_negative_ts",
        "make_zero",
        `seg_${i}.mp4`,
      ]);
    }

    onProgress({
      stage: "stitching",
      percent: 80,
      message: "Stitching segments together...",
    });

    // Build concat list
    const concatList = segments
      .map((_, i) => `file 'seg_${i}.mp4'`)
      .join("\n");
    await ffmpeg.writeFile("concat.txt", concatList);

    await ffmpeg.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat.txt",
      "-c",
      "copy",
      "output.mp4",
    ]);
  }

  onProgress({ stage: "stitching", percent: 95, message: "Finalizing..." });

  const outputData = await ffmpeg.readFile("output.mp4");
  const blob = new Blob([(outputData as any).buffer ?? outputData], {
    type: "video/mp4",
  });

  await ffmpeg.terminate();

  onProgress({ stage: "done", percent: 100, message: "Export complete!" });

  return blob;
}
