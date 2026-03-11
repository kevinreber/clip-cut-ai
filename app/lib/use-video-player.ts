import { useCallback, useEffect, useRef, useState } from "react";

export function useVideoPlayer(videoUrl: string | null | undefined) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoadedMetadata = () => setDuration(video.duration);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    if (video.duration) setDuration(video.duration);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [videoUrl]);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) { video.play(); } else { video.pause(); }
    }
  }, []);

  const seekRelative = useCallback((delta: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(
        0,
        Math.min(video.duration, video.currentTime + delta)
      );
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
    }
    setPlaybackRateState(rate);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (video) {
      video.volume = vol;
    }
    setVolumeState(vol);
  }, []);

  return {
    videoRef,
    currentTime,
    duration,
    isPlaying,
    seekTo,
    togglePlayPause,
    seekRelative,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
  };
}
