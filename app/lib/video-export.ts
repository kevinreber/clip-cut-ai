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

export type ExportQuality = "original" | "fast" | "balanced" | "high";

export type FadeOptions = {
  enabled: boolean;
  duration: number; // in seconds, e.g., 0.3
};

const QUALITY_PRESETS: Record<
  Exclude<ExportQuality, "original">,
  { preset: string; crf: string; audioBitrate: string }
> = {
  fast: { preset: "ultrafast", crf: "28", audioBitrate: "128k" },
  balanced: { preset: "medium", crf: "23", audioBitrate: "192k" },
  high: { preset: "slow", crf: "18", audioBitrate: "256k" },
};

export async function exportVideo(
  videoUrl: string,
  transcript: TranscriptWord[],
  videoDuration: number,
  onProgress: (progress: ExportProgress) => void,
  quality: ExportQuality = "fast",
  fade?: FadeOptions
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

  // "original" uses stream copy (no re-encoding) for maximum quality.
  // Cuts snap to the nearest keyframe, so there may be slight imprecision
  // at edit boundaries, but the video/audio quality is perfectly preserved.
  const useStreamCopy = quality === "original";

  const useFade = fade?.enabled && fade.duration > 0;
  const fadeDur = fade?.duration ?? 0.3;

  function buildSegmentArgs(seg: Segment, outputName: string, isFirst: boolean, isLast: boolean): string[] {
    const segDuration = seg.end - seg.start;
    if (useStreamCopy && !useFade) {
      return [
        "-i",
        "input.mp4",
        "-ss",
        seg.start.toFixed(3),
        "-to",
        seg.end.toFixed(3),
        "-c",
        "copy",
        "-avoid_negative_ts",
        "make_zero",
        outputName,
      ];
    }
    const q = useStreamCopy ? QUALITY_PRESETS["fast"] : QUALITY_PRESETS[quality as Exclude<ExportQuality, "original">];
    const args = [
      "-i",
      "input.mp4",
      "-ss",
      seg.start.toFixed(3),
      "-to",
      seg.end.toFixed(3),
      "-c:v",
      "libx264",
      "-preset",
      q.preset,
      "-crf",
      q.crf,
      "-pix_fmt",
      "yuv420p",
    ];

    // Build audio and video filters for fade
    if (useFade && segDuration > fadeDur * 2) {
      const audioFilters: string[] = [];
      const videoFilters: string[] = [];
      if (!isFirst) {
        audioFilters.push(`afade=t=in:st=0:d=${fadeDur}`);
        videoFilters.push(`fade=t=in:st=0:d=${fadeDur}`);
      }
      if (!isLast) {
        const fadeOutStart = segDuration - fadeDur;
        audioFilters.push(`afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDur}`);
        videoFilters.push(`fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDur}`);
      }
      if (videoFilters.length > 0) {
        args.push("-vf", videoFilters.join(","));
      }
      if (audioFilters.length > 0) {
        args.push("-af", audioFilters.join(","));
      }
      args.push("-c:a", "aac", "-b:a", q.audioBitrate);
    } else {
      args.push("-c:a", "aac", "-b:a", q.audioBitrate);
    }

    args.push(
      "-movflags",
      "+faststart",
      "-avoid_negative_ts",
      "make_zero",
      outputName
    );
    return args;
  }

  // Build a concat filter for the segments
  if (segments.length === 1) {
    // Simple trim
    const seg = segments[0];
    await ffmpeg.exec(buildSegmentArgs(seg, "output.mp4", true, true));
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
      await ffmpeg.exec(buildSegmentArgs(seg, `seg_${i}.mp4`, i === 0, i === segments.length - 1));
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
      "-movflags",
      "+faststart",
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

export async function exportAudio(
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
      message: `Extracting audio... ${Math.round(progress * 100)}%`,
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

  const audioBitrate = quality === "high" ? "192k" : quality === "balanced" ? "128k" : "96k";

  if (segments.length === 1) {
    const seg = segments[0];
    await ffmpeg.exec([
      "-i", "input.mp4",
      "-ss", seg.start.toFixed(3),
      "-to", seg.end.toFixed(3),
      "-vn",
      "-acodec", "libmp3lame",
      "-ab", audioBitrate,
      "output.mp3",
    ]);
  } else {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      onProgress({
        stage: "processing",
        percent: 5 + Math.round((i / segments.length) * 70),
        message: `Extracting segment ${i + 1} of ${segments.length}...`,
      });
      await ffmpeg.exec([
        "-i", "input.mp4",
        "-ss", seg.start.toFixed(3),
        "-to", seg.end.toFixed(3),
        "-vn",
        "-acodec", "libmp3lame",
        "-ab", audioBitrate,
        `seg_${i}.mp3`,
      ]);
    }

    onProgress({
      stage: "stitching",
      percent: 80,
      message: "Stitching audio segments...",
    });

    const concatList = segments
      .map((_, i) => `file 'seg_${i}.mp3'`)
      .join("\n");
    await ffmpeg.writeFile("concat.txt", concatList);

    await ffmpeg.exec([
      "-f", "concat",
      "-safe", "0",
      "-i", "concat.txt",
      "-c", "copy",
      "output.mp3",
    ]);
  }

  onProgress({ stage: "stitching", percent: 95, message: "Finalizing..." });

  const outputData = await ffmpeg.readFile("output.mp3");
  const blob = new Blob([(outputData as any).buffer ?? outputData], {
    type: "audio/mpeg",
  });

  await ffmpeg.terminate();

  onProgress({ stage: "done", percent: 100, message: "Audio export complete!" });

  return blob;
}
