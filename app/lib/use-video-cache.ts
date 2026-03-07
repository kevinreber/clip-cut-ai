import { useEffect, useState } from "react";
import { getCachedVideo, cacheVideo } from "./video-cache";

export function useVideoCache(
  storageId: string | undefined,
  remoteUrl: string | null | undefined
): string | null | undefined {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storageId || !remoteUrl) return;
    let revoked = false;

    (async () => {
      const cached = await getCachedVideo(storageId);
      if (cached) {
        const url = URL.createObjectURL(cached);
        if (!revoked) setCachedUrl(url);
        return;
      }
      try {
        const resp = await fetch(remoteUrl);
        const blob = await resp.blob();
        await cacheVideo(storageId, blob);
        if (!revoked) {
          const url = URL.createObjectURL(blob);
          setCachedUrl(url);
        }
      } catch {
        // Fall back to remote URL
      }
    })();

    return () => {
      revoked = true;
    };
  }, [storageId, remoteUrl]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (cachedUrl) URL.revokeObjectURL(cachedUrl);
    };
  }, [cachedUrl]);

  return cachedUrl || remoteUrl;
}
