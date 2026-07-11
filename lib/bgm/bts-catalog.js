export const BTS_FALLBACK_TRACKS = [
  {
    videoId: "gdZLi9oWNZg",
    title: "BTS (방탄소년단) 'Dynamite' Official Audio",
    channelTitle: "Big Hit Labels",
  },
  {
    videoId: "WMweEpGlu_U",
    title: "BTS (방탄소년단) 'Butter' Official Audio",
    channelTitle: "HYBE LABELS",
  },
  {
    videoId: "CuklIb9d3fI",
    title: "BTS (방탄소년단) 'Permission to Dance' Official Audio",
    channelTitle: "HYBE LABELS",
  },
  {
    videoId: "mPVDGOVjRQ0",
    title: "BTS (방탄소년단) 'ON' Official Audio",
    channelTitle: "Big Hit Labels",
  },
  {
    videoId: "0lapF4DQPKQ",
    title: "BTS (방탄소년단) 'Black Swan' Official Audio",
    channelTitle: "Big Hit Labels",
  },
  {
    videoId: "-5q5mZbe3V8",
    title: "BTS (방탄소년단) 'Life Goes On' Official Audio",
    channelTitle: "Big Hit Labels",
  },
];

export const YOUTUBE_BTS_QUERIES = [
  "BTS official audio",
  "BTS audio official",
  "BTS official audio track",
];

export function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function looksLikeBtsTrack(candidate) {
  const title = normalizeText(candidate?.title).toLowerCase();
  const channelTitle = normalizeText(candidate?.channelTitle).toLowerCase();
  return (
    title.includes("bts") ||
    channelTitle.includes("bts") ||
    channelTitle.includes("hybe labels") ||
    channelTitle.includes("big hit") ||
    channelTitle.includes("bangtantv")
  );
}

export function looksLikeBtsAudioTrack(candidate) {
  const title = normalizeText(candidate?.title).toLowerCase();
  const channelTitle = normalizeText(candidate?.channelTitle).toLowerCase();

  if (!looksLikeBtsTrack(candidate)) {
    return false;
  }

  const hasAudioKeyword =
    title.includes("audio") ||
    title.includes("official audio") ||
    title.includes("lyrics") ||
    title.includes("lyric") ||
    channelTitle.includes("audio");

  const isVideoLike =
    title.includes("mv") ||
    title.includes("music video") ||
    title.includes("video") ||
    title.includes("teaser") ||
    title.includes("performance") ||
    title.includes("live");

  return hasAudioKeyword && !isVideoLike;
}

export function dedupeTracks(tracks = []) {
  const seen = new Set();
  const output = [];

  for (const track of tracks) {
    const videoId = normalizeText(track?.videoId);
    if (!videoId || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);
    output.push({
      videoId,
      title: normalizeText(track?.title),
      channelTitle: normalizeText(track?.channelTitle),
      publishedAt: normalizeText(track?.publishedAt),
      source: normalizeText(track?.source) || "fallback",
    });
  }

  return output;
}
