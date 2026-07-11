"use client";

import { useEffect, useRef, useState } from "react";
import { BTS_FALLBACK_TRACKS } from "../lib/bgm/bts-catalog.js";

const STORAGE_KEY = "fifa-half-time-show-music-enabled";
const BGM_SESSION_ID_KEY = "fifa-half-time-show-bgm-session-id";
const BGM_PLAYED_IDS_KEY = "fifa-half-time-show-bgm-played-video-ids";
const PLAYER_SCRIPT_ID = "youtube-iframe-api";
const PLAYER_VOLUME_START = 1;
const PLAYER_VOLUME_TARGET = 50;
const PLAYER_VOLUME_STEP_MS = 1000;
const PLAYER_VOLUME_RAMP_MS = 10000;

let youtubeApiPromise = null;

function loadPreference() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function savePreference(enabled) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Best effort only.
  }
}

function getOrCreateSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const existing = window.sessionStorage.getItem(BGM_SESSION_ID_KEY);
    if (existing) {
      return existing;
    }

    const nextId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(BGM_SESSION_ID_KEY, nextId);
    return nextId;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function loadPlayedVideoIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(BGM_PLAYED_IDS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string" && value.trim()) : [];
  } catch {
    return [];
  }
}

function savePlayedVideoIds(videoIds) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(BGM_PLAYED_IDS_KEY, JSON.stringify(videoIds));
  } catch {
    // Best effort only.
  }
}

function normalizeTrack(track) {
  if (!track?.videoId) {
    return null;
  }

  return {
    videoId: track.videoId,
    title: track.title || "BTS track",
    channelTitle: track.channelTitle || "YouTube",
    publishedAt: track.publishedAt || "",
    source: track.source || "fallback",
  };
}

function pickRandomFallback(recentIds) {
  const freshTracks = BTS_FALLBACK_TRACKS.filter((track) => !recentIds.includes(track.videoId));
  const pool = freshTracks.length > 0 ? freshTracks : BTS_FALLBACK_TRACKS;

  if (!pool.length) {
    return null;
  }

  return normalizeTrack(pool[Math.floor(Math.random() * pool.length)]);
}

function loadYouTubeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API can only load in the browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(PLAYER_SCRIPT_ID);

      window.onYouTubeIframeAPIReady = () => {
        resolve(window.YT);
      };

      if (!existingScript) {
        const script = document.createElement("script");
        script.id = PLAYER_SCRIPT_ID;
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => {
          youtubeApiPromise = null;
          reject(new Error("Failed to load the YouTube IFrame API."));
        };
        document.head.appendChild(script);
      }
    });
  }

  return youtubeApiPromise;
}

export function BackgroundMusic() {
  const [enabled, setEnabled] = useState(() => loadPreference());
  const [status, setStatus] = useState("idle");
  const enabledRef = useRef(enabled);
  const sessionIdRef = useRef("");
  const playerMountRef = useRef(null);
  const playerRef = useRef(null);
  const recentIdsRef = useRef([]);
  const currentTrackRef = useRef(null);
  const volumeTimerRef = useRef(null);
  const bootstrappingRef = useRef(false);
  const waitingForGestureRef = useRef(false);
  const volumeTargetReachedRef = useRef(false);
  const destroyedRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    recentIdsRef.current = loadPlayedVideoIds();
  }, []);

  function clearVolumeRamp() {
    if (volumeTimerRef.current) {
      window.clearTimeout(volumeTimerRef.current);
      volumeTimerRef.current = null;
    }
  }

  function resetSessionState() {
    clearVolumeRamp();
    bootstrappingRef.current = false;
    waitingForGestureRef.current = false;
    volumeTargetReachedRef.current = false;
    currentTrackRef.current = null;
    setStatus("idle");
  }

  function destroyPlayer() {
    destroyedRef.current = true;

    clearVolumeRamp();

    const player = playerRef.current;
    playerRef.current = null;

    if (player?.destroy) {
      try {
        player.destroy();
      } catch {
        // Ignore teardown failures.
      }
    }

    resetSessionState();
  }

  function rememberTrack(videoId) {
    if (!videoId) {
      return;
    }

    recentIdsRef.current = [videoId, ...recentIdsRef.current.filter((id) => id !== videoId)];
    savePlayedVideoIds(recentIdsRef.current);
  }

  async function requestNextTrack() {
    try {
      const response = await fetch("/api/bgm/youtube/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current || getOrCreateSessionId(),
          recentVideoIds: recentIdsRef.current,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const track = normalizeTrack(data?.track);
        if (track) {
          return track;
        }
      }
    } catch {
      // Fall through to local fallback selection.
    }

    return pickRandomFallback(recentIdsRef.current);
  }

  function startVolumeRamp() {
    clearVolumeRamp();

    const player = playerRef.current;
    if (!player?.setVolume) {
      return;
    }

    if (volumeTargetReachedRef.current) {
      try {
        player.setVolume(PLAYER_VOLUME_TARGET);
      } catch {
        // Ignore player volume failures.
      }
      return;
    }

    const startedAt = Date.now();

    const tick = () => {
      const activePlayer = playerRef.current;
      if (!activePlayer?.setVolume || destroyedRef.current) {
        return;
      }

      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / PLAYER_VOLUME_RAMP_MS, 1);
      const volume = Math.round(
        PLAYER_VOLUME_START + progress * (PLAYER_VOLUME_TARGET - PLAYER_VOLUME_START),
      );

      try {
        activePlayer.setVolume(volume);
      } catch {
        // Ignore player volume failures.
      }

      if (progress < 1) {
        volumeTimerRef.current = window.setTimeout(tick, PLAYER_VOLUME_STEP_MS);
      } else {
        volumeTimerRef.current = null;
        volumeTargetReachedRef.current = true;
      }
    };

    tick();
  }

  async function playNextTrack() {
    if (!enabledRef.current) {
      return;
    }

    const player = playerRef.current;
    if (!player?.loadVideoById) {
      return;
    }

    if (bootstrappingRef.current) {
      return;
    }

    bootstrappingRef.current = true;
    setStatus("loading");

    try {
      const track = await requestNextTrack();
      if (!track || !enabledRef.current || !playerRef.current) {
        return;
      }

      currentTrackRef.current = track;
      rememberTrack(track.videoId);

      try {
        playerRef.current.loadVideoById(track.videoId);
      } catch {
        // If the load fails, try a fallback on the next interaction.
      }
    } finally {
      bootstrappingRef.current = false;
    }
  }

  async function ensurePlayer() {
    if (playerRef.current || destroyedRef.current) {
      return;
    }

    await loadYouTubeApi();
    if (!enabledRef.current || destroyedRef.current || !playerMountRef.current || playerRef.current) {
      return;
    }

    playerRef.current = new window.YT.Player(playerMountRef.current, {
      height: "200",
      width: "200",
      videoId: "",
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          if (destroyedRef.current || !enabledRef.current) {
            return;
          }

          try {
            playerRef.current?.setVolume?.(
              volumeTargetReachedRef.current ? PLAYER_VOLUME_TARGET : PLAYER_VOLUME_START,
            );
          } catch {
            // Best effort only.
          }

          void playNextTrack();
        },
        onStateChange: (event) => {
          if (destroyedRef.current) {
            return;
          }

          const playerState = event?.data;
          const ytState = window.YT?.PlayerState;

          if (playerState === ytState?.PLAYING) {
            waitingForGestureRef.current = false;
            setStatus("playing");
            startVolumeRamp();
            return;
          }

          if (playerState === ytState?.PAUSED && enabledRef.current) {
            setStatus("ready");
            return;
          }

          if (playerState === ytState?.ENDED) {
            clearVolumeRamp();
            void playNextTrack();
          }
        },
        onAutoplayBlocked: () => {
          if (destroyedRef.current) {
            return;
          }

          waitingForGestureRef.current = true;
          setStatus("waiting");
        },
        onError: () => {
          if (destroyedRef.current) {
            return;
          }

          clearVolumeRamp();
          void playNextTrack();
        },
      },
    });
  }

  function resumePlaybackFromGesture() {
    const player = playerRef.current;
    if (!player?.playVideo) {
      return;
    }

    if (waitingForGestureRef.current || player.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING) {
      try {
        player.playVideo();
        setStatus("playing");
      } catch {
        // If playVideo still fails, the next gesture will try again.
      }
    }
  }

  useEffect(() => {
    savePreference(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      destroyPlayer();
      return undefined;
    }

    destroyedRef.current = false;
    setStatus("loading");

    void ensurePlayer();

    const onGesture = () => {
      if (!enabledRef.current) {
        return;
      }

      resumePlaybackFromGesture();
    };

    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    window.addEventListener("touchstart", onGesture, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      destroyPlayer();
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      destroyPlayer();
    };
  }, []);

  function handleToggle() {
    setEnabled((current) => !current);
  }

  const label =
    status === "playing"
      ? "BGM on"
      : status === "waiting"
        ? "Tap to resume"
        : enabled
          ? "BGM ready"
          : "BGM off";

  return (
    <>
      <div className="bgm-shell" aria-hidden="true">
        <div ref={playerMountRef} className="bgm-player" />
      </div>
      <button
        aria-pressed={enabled}
        className={`bgm-toggle ${enabled ? "is-on" : "is-off"}`}
        onClick={handleToggle}
        type="button"
      >
        <span className="bgm-toggle-dot" aria-hidden="true" />
        <span>{label}</span>
      </button>
    </>
  );
}
