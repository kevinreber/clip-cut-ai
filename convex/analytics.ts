import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const readyProjects = projects.filter((p) => p.status === "ready" && p.transcript);

    let totalWords = 0;
    let totalFillerWords = 0;
    let totalDeletedWords = 0;
    let totalDuration = 0;
    let timeSaved = 0;
    const fillerWordCounts: Record<string, number> = {};
    const perProject: Array<{
      id: string;
      name: string;
      createdAt: number;
      totalWords: number;
      fillerWords: number;
      fillerPercentage: number;
      deletedWords: number;
      timeSaved: number;
      duration: number;
      wordsPerMinute: number;
    }> = [];

    for (const project of readyProjects) {
      const transcript = project.transcript!;
      const projectTotalWords = transcript.length;
      const projectFillerWords = transcript.filter((w) => w.isFiller).length;
      const projectDeletedWords = transcript.filter((w) => w.isDeleted).length;
      const projectTimeSaved = transcript
        .filter((w) => w.isDeleted || w.isFiller)
        .reduce((sum, w) => sum + (w.end - w.start), 0);
      const projectDuration =
        transcript.length > 0
          ? transcript[transcript.length - 1].end - transcript[0].start
          : 0;
      const projectWpm =
        projectDuration > 0 ? (projectTotalWords / projectDuration) * 60 : 0;

      // Count filler words
      for (const word of transcript) {
        if (word.isFiller) {
          const normalized = word.word.toLowerCase().trim();
          fillerWordCounts[normalized] = (fillerWordCounts[normalized] || 0) + 1;
        }
      }

      totalWords += projectTotalWords;
      totalFillerWords += projectFillerWords;
      totalDeletedWords += projectDeletedWords;
      totalDuration += projectDuration;
      timeSaved += projectTimeSaved;

      perProject.push({
        id: project._id,
        name: project.name,
        createdAt: project.createdAt,
        totalWords: projectTotalWords,
        fillerWords: projectFillerWords,
        fillerPercentage:
          projectTotalWords > 0
            ? Math.round((projectFillerWords / projectTotalWords) * 1000) / 10
            : 0,
        deletedWords: projectDeletedWords,
        timeSaved: Math.round(projectTimeSaved * 10) / 10,
        duration: Math.round(projectDuration * 10) / 10,
        wordsPerMinute: Math.round(projectWpm),
      });
    }

    // Sort filler words by frequency
    const topFillerWords = Object.entries(fillerWordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // Sort per-project by creation date for trend display
    perProject.sort((a, b) => a.createdAt - b.createdAt);

    return {
      totalProjects: projects.length,
      analyzedProjects: readyProjects.length,
      totalWords,
      totalFillerWords,
      totalDeletedWords,
      fillerPercentage:
        totalWords > 0
          ? Math.round((totalFillerWords / totalWords) * 1000) / 10
          : 0,
      totalDuration: Math.round(totalDuration),
      timeSaved: Math.round(timeSaved),
      averageWpm:
        totalDuration > 0
          ? Math.round((totalWords / totalDuration) * 60)
          : 0,
      topFillerWords,
      perProject,
    };
  },
});
