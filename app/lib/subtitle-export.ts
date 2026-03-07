type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
};

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

function groupWordsIntoCues(
  transcript: TranscriptWord[],
  maxWordsPerCue = 8,
  maxCueDuration = 4
): { text: string; start: number; end: number }[] {
  const kept = transcript.filter((w) => !w.isDeleted && !w.word.startsWith("[silence"));
  const cues: { text: string; start: number; end: number }[] = [];
  let cueWords: TranscriptWord[] = [];

  for (const word of kept) {
    cueWords.push(word);
    const cueDuration = word.end - cueWords[0].start;
    if (cueWords.length >= maxWordsPerCue || cueDuration >= maxCueDuration) {
      cues.push({
        text: cueWords.map((w) => w.word).join(" "),
        start: cueWords[0].start,
        end: cueWords[cueWords.length - 1].end,
      });
      cueWords = [];
    }
  }

  if (cueWords.length > 0) {
    cues.push({
      text: cueWords.map((w) => w.word).join(" "),
      start: cueWords[0].start,
      end: cueWords[cueWords.length - 1].end,
    });
  }

  return cues;
}

export function generateSrt(transcript: TranscriptWord[]): string {
  const cues = groupWordsIntoCues(transcript);
  return cues
    .map(
      (cue, i) =>
        `${i + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text}`
    )
    .join("\n\n");
}

export function generateVtt(transcript: TranscriptWord[]): string {
  const cues = groupWordsIntoCues(transcript);
  const body = cues
    .map(
      (cue) =>
        `${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}\n${cue.text}`
    )
    .join("\n\n");
  return `WEBVTT\n\n${body}`;
}

export function generatePlainText(transcript: TranscriptWord[]): string {
  return transcript
    .filter((w) => !w.isDeleted && !w.word.startsWith("[silence"))
    .map((w) => w.word)
    .join(" ");
}

export function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
