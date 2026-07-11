export const BTS_FALLBACK_TRACKS = [
  {
    videoId: "gdZLi9oWNZg",
    title: "BTS (방탄소년단) 'Dynamite' Official MV",
    channelTitle: "Big Hit Labels",
  },
  {
    videoId: "WMweEpGlu_U",
    title: "BTS (방탄소년단) 'Butter' Official MV",
    channelTitle: "HYBE LABELS",
  },
  {
    videoId: "CuklIb9d3fI",
    title: "BTS (방탄소년단) 'Permission to Dance' Official MV",
    channelTitle: "HYBE LABELS",
  },
  {
    videoId: "mPVDGOVjRQ0",
    title: "BTS (방탄소년단) 'ON' Official MV",
    channelTitle: "Big Hit Labels",
  },
  {
    videoId: "0lapF4DQPKQ",
    title: "BTS (방탄소년단) 'Black Swan' Official MV",
    channelTitle: "Big Hit Labels",
  },
  {
    videoId: "-5q5mZbe3V8",
    title: "BTS (방탄소년단) 'Life Goes On' Official MV",
    channelTitle: "Big Hit Labels",
  },
];

export const YOUTUBE_BTS_QUERIES = [
  "BTS official MV",
  "BTS official music video",
  "BTS official video",
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
