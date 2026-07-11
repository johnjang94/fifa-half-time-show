"use client";

import { useEffect, useRef, useState } from "react";
import { BTS_FALLBACK_TRACKS } from "../lib/bgm/bts-catalog.js";

const STORAGE_KEY = "fifa-half-time-show-music-enabled";
const BGM_SESSION_ID_KEY = "fifa-half-time-show-bgm-session-id";
const BGM_PLAYED_IDS_KEY = "fifa-half-time-show-bgm-played-video-ids";
const PLAYER_SCRIPT_ID = "youtube-iframe-api";
const PLAYER_VOLUME_START = 1;
const PLAYER_VOLUME_TARGET = 50;
const PLAYER_VOLUME_STEP_MS = 250;
const PLAYER_VOLUME_RAMP_MS = 10000;
const PREFETCH_WINDOW_MS = 7000;
const CROSSFADE_WINDOW_MS = 5000;

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
  const playerMountPrimaryRef = useRef(null);
  const playerMountSecondaryRef = useRef(null);
  const playersRef = useRef({
    primary: null,
    secondary: null,
  });
  const playerReadyRef = useRef({
    primary: false,
    secondary: false,
  });
  const activeSlotRef = useRef("primary");
  const currentTrackRef = useRef(null);
  const queuedTrackRef = useRef(null);
  const queuedSlotRef = useRef("");
  const recentIdsRef = useRef([]);
  const initializedRef = useRef(false);
  const prefetchInFlightRef = useRef(false);
  const crossfadeInProgressRef = useRef(false);
  const volumeRampTimersRef = useRef({
    primary: null,
    secondary: null,
  });
  const monitorTimerRef = useRef(null);
  const destroyRequestedRef = useRef(false);
  const waitingForGestureRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    recentIdsRef.current = loadPlayedVideoIds();
  }, []);

  function getPlayer(slot) {
    return playersRef.current[slot];
  }

  function getOtherSlot(slot) {
    return slot === "primary" ? "secondary" : "primary";
  }

  function getMountNode(slot) {
    return slot === "primary" ? playerMountPrimaryRef.current : playerMountSecondaryRef.current;
  }

  function clearTimer(slot) {
    const timer = volumeRampTimersRef.current[slot];
    if (timer) {
      window.clearTimeout(timer);
      volumeRampTimersRef.current[slot] = null;
    }
  }

  function clearAllTimers() {
    clearTimer("primary");
    clearTimer("secondary");

    if (monitorTimerRef.current) {
      window.clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
  }

  function stopMonitoring() {
    if (monitorTimerRef.current) {
      window.clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
  }

  function resetRuntimeState() {
    clearAllTimers();
    prefetchInFlightRef.current = false;
    crossfadeInProgressRef.current = false;
    initializedRef.current = false;
    waitingForGestureRef.current = false;
    currentTrackRef.current = null;
    queuedTrackRef.current = null;
    queuedSlotRef.current = "";
    activeSlotRef.current = "primary";
    setStatus("idle");
  }

  function destroyPlayers() {
    destroyRequestedRef.current = true;
    clearAllTimers();

    const primary = playersRef.current.primary;
    const secondary = playersRef.current.secondary;
    playersRef.current.primary = null;
    playersRef.current.secondary = null;
    playerReadyRef.current.primary = false;
    playerReadyRef.current.secondary = false;

    for (const player of [primary, secondary]) {
      if (!player?.destroy) {
        continue;
      }

      try {
        player.destroy();
      } catch {
        // Ignore teardown failures.
      }
    }

    resetRuntimeState();
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

  function setSlotVolume(slot, volume) {
    const player = getPlayer(slot);
    if (!player?.setVolume) {
      return;
    }

    try {
      player.setVolume(Math.max(0, Math.min(100, Math.round(volume))));
    } catch {
      // Best effort only.
    }
  }

  function startVolumeRamp(slot, fromVolume, toVolume, durationMs) {
    clearTimer(slot);

    const startedAt = Date.now();

    const tick = () => {
      const player = getPlayer(slot);
      if (!player?.setVolume || destroyRequestedRef.current) {
        return;
      }

      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / durationMs, 1);
      const nextVolume = fromVolume + (toVolume - fromVolume) * progress;
      setSlotVolume(slot, nextVolume);

      if (progress < 1) {
        volumeRampTimersRef.current[slot] = window.setTimeout(tick, PLAYER_VOLUME_STEP_MS);
      } else {
        volumeRampTimersRef.current[slot] = null;
      }
    };

    tick();
  }

  async function cueTrackIntoSlot(slot, track, shouldAutoplay = false) {
    const player = getPlayer(slot);
    if (!player?.cueVideoById && !player?.loadVideoById) {
      return false;
    }

    try {
      setSlotVolume(slot, shouldAutoplay ? PLAYER_VOLUME_START : 0);
      if (shouldAutoplay && player.loadVideoById) {
        player.loadVideoById(track.videoId);
      } else if (player.cueVideoById) {
        player.cueVideoById(track.videoId);
      } else {
        player.loadVideoById(track.videoId);
      }
      return true;
    } catch {
      return false;
    }
  }

  async function prefetchNextTrack() {
    if (prefetchInFlightRef.current || destroyRequestedRef.current) {
      return;
    }

    const standbySlot = getOtherSlot(activeSlotRef.current);
    if (queuedTrackRef.current && queuedSlotRef.current === standbySlot) {
      return;
    }

    prefetchInFlightRef.current = true;

    try {
      const track = await requestNextTrack();
      if (!track || destroyRequestedRef.current || !enabledRef.current) {
        return;
      }

      queuedTrackRef.current = track;
      queuedSlotRef.current = standbySlot;
      rememberTrack(track.videoId);
      const queued = await cueTrackIntoSlot(standbySlot, track, false);
      if (!queued) {
        queuedTrackRef.current = null;
        queuedSlotRef.current = "";
      }
    } finally {
      prefetchInFlightRef.current = false;
    }
  }

  async function startInitialPlayback() {
    if (initializedRef.current || destroyRequestedRef.current) {
      return;
    }

    initializedRef.current = true;
    setStatus("loading");

    const track = await requestNextTrack();
    if (!track || destroyRequestedRef.current || !enabledRef.current) {
      initializedRef.current = false;
      return;
    }

    currentTrackRef.current = track;
    activeSlotRef.current = "primary";
    rememberTrack(track.videoId);

    const started = await cueTrackIntoSlot("primary", track, true);
    if (!started) {
      initializedRef.current = false;
      return;
    }

    setStatus("playing");
    startVolumeRamp("primary", PLAYER_VOLUME_START, PLAYER_VOLUME_TARGET, PLAYER_VOLUME_RAMP_MS);
    void prefetchNextTrack();
    startMonitoring();
  }

  function startMonitoring() {
    if (monitorTimerRef.current) {
      return;
    }

    monitorTimerRef.current = window.setInterval(() => {
      if (destroyRequestedRef.current || !enabledRef.current || crossfadeInProgressRef.current) {
        return;
      }

      const activeSlot = activeSlotRef.current;
      const player = getPlayer(activeSlot);
      if (!player?.getDuration || !player?.getCurrentTime) {
        return;
      }

      const duration = player.getDuration();
      const currentTime = player.getCurrentTime();
      if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) {
        return;
      }

      const remaining = duration - currentTime;

      if (remaining <= CROSSFADE_WINDOW_MS / 1000 && queuedTrackRef.current) {
        void beginCrossfade();
        return;
      }

      if (remaining <= PREFETCH_WINDOW_MS / 1000 && !queuedTrackRef.current && !prefetchInFlightRef.current) {
        void prefetchNextTrack();
      }
    }, 500);
  }

  async function beginCrossfade() {
    if (crossfadeInProgressRef.current || destroyRequestedRef.current || !queuedTrackRef.current) {
      return;
    }

    const fromSlot = activeSlotRef.current;
    const toSlot = getOtherSlot(fromSlot);
    const fromPlayer = getPlayer(fromSlot);
    const toPlayer = getPlayer(toSlot);
    const nextTrack = queuedTrackRef.current;

    if (!fromPlayer || !toPlayer || !nextTrack) {
      return;
    }

    crossfadeInProgressRef.current = true;
    setStatus("crossfading");

    try {
      setSlotVolume(toSlot, 0);
      if (toPlayer.playVideo) {
        toPlayer.playVideo();
      }
    } catch {
      // If autoplay is blocked, the next gesture will resume playback.
      waitingForGestureRef.current = true;
      setStatus("waiting");
      crossfadeInProgressRef.current = false;
      return;
    }

    const startedAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / CROSSFADE_WINDOW_MS, 1);

      setSlotVolume(fromSlot, PLAYER_VOLUME_TARGET * (1 - progress));
      setSlotVolume(toSlot, PLAYER_VOLUME_TARGET * progress);

      if (progress < 1 && !destroyRequestedRef.current) {
        volumeRampTimersRef.current[fromSlot] = window.setTimeout(tick, PLAYER_VOLUME_STEP_MS);
        return;
      }

      clearTimer(fromSlot);
      clearTimer(toSlot);

      try {
        fromPlayer.stopVideo?.();
      } catch {
        // Best effort only.
      }

      activeSlotRef.current = toSlot;
      currentTrackRef.current = nextTrack;
      queuedTrackRef.current = null;
      queuedSlotRef.current = "";
      crossfadeInProgressRef.current = false;
      setStatus("playing");
      startVolumeRamp(toSlot, PLAYER_VOLUME_TARGET, PLAYER_VOLUME_TARGET, 1);
      void prefetchNextTrack();
      startMonitoring();
    };

    tick();
  }

  function resumePlaybackFromGesture() {
    const activePlayer = getPlayer(activeSlotRef.current);
    const standbyPlayer = getPlayer(getOtherSlot(activeSlotRef.current));

    try {
      activePlayer?.playVideo?.();
      standbyPlayer?.playVideo?.();
      waitingForGestureRef.current = false;
      setStatus(crossfadeInProgressRef.current ? "crossfading" : "playing");
    } catch {
      // Best effort only.
    }
  }

  function handlePlayerReady(slot) {
    if (destroyRequestedRef.current || !enabledRef.current) {
      return;
    }

    playerReadyRef.current[slot] = true;

    if (queuedTrackRef.current && queuedSlotRef.current === slot) {
      void cueTrackIntoSlot(slot, queuedTrackRef.current, false);
    }

    if (!initializedRef.current && slot === activeSlotRef.current) {
      void startInitialPlayback();
      return;
    }

    if (initializedRef.current && currentTrackRef.current && slot !== activeSlotRef.current && queuedTrackRef.current) {
      void cueTrackIntoSlot(slot, queuedTrackRef.current, false);
    }
  }

  function handlePlayerStateChange(slot, event) {
    if (destroyRequestedRef.current) {
      return;
    }

    const playerState = event?.data;
    const ytState = window.YT?.PlayerState;
    const activeSlot = activeSlotRef.current;

    if (playerState === ytState?.PLAYING) {
      if (slot === activeSlot) {
        setStatus(crossfadeInProgressRef.current ? "crossfading" : "playing");
      }
      waitingForGestureRef.current = false;
      return;
    }

    if (playerState === ytState?.PAUSED) {
      if (slot === activeSlot && enabledRef.current) {
        setStatus("ready");
      }
      return;
    }

    if (playerState === ytState?.ENDED && slot === activeSlot) {
      if (queuedTrackRef.current) {
        void beginCrossfade();
      } else {
        void prefetchNextTrack();
      }
    }
  }

  function handleAutoplayBlocked() {
    if (destroyRequestedRef.current) {
      return;
    }

    waitingForGestureRef.current = true;
    setStatus("waiting");
  }

  function handlePlayerError() {
    if (destroyRequestedRef.current) {
      return;
    }

    void prefetchNextTrack();
  }

  async function ensurePlayers() {
    if (playersRef.current.primary || playersRef.current.secondary || destroyRequestedRef.current) {
      return;
    }

    await loadYouTubeApi();
    if (destroyRequestedRef.current || !enabledRef.current) {
      return;
    }

    const commonConfig = (slot) => ({
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
        onReady: () => handlePlayerReady(slot),
        onStateChange: (event) => handlePlayerStateChange(slot, event),
        onAutoplayBlocked: handleAutoplayBlocked,
        onError: handlePlayerError,
      },
    });

    const primaryMount = getMountNode("primary");
    const secondaryMount = getMountNode("secondary");
    if (!primaryMount || !secondaryMount) {
      return;
    }

    playersRef.current.primary = new window.YT.Player(primaryMount, commonConfig("primary"));
    playersRef.current.secondary = new window.YT.Player(secondaryMount, commonConfig("secondary"));
  }

  useEffect(() => {
    savePreference(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      destroyPlayers();
      return undefined;
    }

    destroyRequestedRef.current = false;
    initializedRef.current = false;
    void ensurePlayers();

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
      destroyPlayers();
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      destroyPlayers();
    };
  }, []);

  function handleToggle() {
    setEnabled((current) => !current);
  }

  const label =
    status === "playing"
      ? "BGM on"
      : status === "crossfading"
        ? "Crossfading"
        : status === "waiting"
          ? "Tap to resume"
          : enabled
            ? "BGM ready"
            : "BGM off";

  return (
    <>
      <div className="bgm-shell" aria-hidden="true">
        <div ref={playerMountPrimaryRef} className="bgm-player" />
        <div ref={playerMountSecondaryRef} className="bgm-player" />
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
