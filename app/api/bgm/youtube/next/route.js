import {
  BTS_FALLBACK_TRACKS,
  YOUTUBE_BTS_QUERIES,
  dedupeTracks,
  looksLikeBtsAudioTrack,
  normalizeText,
} from "../../../../../lib/bgm/bts-catalog.js";

export const dynamic = "force-dynamic";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const DEFAULT_MODEL = process.env.OPENAI_BGM_MODEL || "gpt-4o-mini";

function normalizeRecentIds(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

function isFreshTrack(track, recentIds) {
  return Boolean(track?.videoId) && !recentIds.includes(track.videoId);
}

function pickRandomTrack(tracks, recentIds) {
  const freshTracks = tracks.filter((track) => isFreshTrack(track, recentIds));
  const pool = freshTracks.length > 0 ? freshTracks : tracks;

  if (!pool.length) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

async function fetchYouTubeSearch(query) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return [];
  }

  const url = new URL(YOUTUBE_SEARCH_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("q", query);
  url.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8500);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    return items
      .map((item) => ({
        videoId: normalizeText(item?.id?.videoId),
        title: normalizeText(item?.snippet?.title),
        channelTitle: normalizeText(item?.snippet?.channelTitle),
        publishedAt: normalizeText(item?.snippet?.publishedAt),
        source: "youtube-search",
      }))
      .filter((track) => track.videoId && looksLikeBtsAudioTrack(track));
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function chooseWithOpenAI(candidates, recentIds) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || candidates.length < 2) {
    return null;
  }

  const prompt = [
    "You are selecting one BTS YouTube audio track for a quiet background music loop.",
    "Choose exactly one candidate from the JSON array.",
    "Prefer an official BTS audio upload or lyric audio, not an MV or music video.",
    "Reject anything that looks like MV, music video, live, performance, teaser, or dance practice.",
    "Avoid any candidate whose videoId appears in the recent history.",
    "Return JSON with only videoId and a short reason.",
    `Recent videoIds: ${JSON.stringify(recentIds)}`,
    `Candidates: ${JSON.stringify(candidates)}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You select a single BTS audio track from the provided candidates and respond with JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  const match = content.match(/\{[\s\S]*\}/);

  try {
    const parsed = JSON.parse(match ? match[0] : content);
    const selectedId = normalizeText(parsed?.videoId);
    return candidates.find((candidate) => candidate.videoId === selectedId) ?? null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const recentIds = normalizeRecentIds(body?.recentVideoIds);

  let candidates = [];

  for (const query of YOUTUBE_BTS_QUERIES) {
    const results = await fetchYouTubeSearch(query);
    candidates.push(...results);
  }

  candidates = dedupeTracks(candidates)
    .filter((track) => looksLikeBtsAudioTrack(track))
    .filter((track) => isFreshTrack(track, recentIds));
  candidates = candidates.slice(0, 15);

  if (!candidates.length) {
    candidates = dedupeTracks(BTS_FALLBACK_TRACKS)
      .filter((track) => looksLikeBtsAudioTrack(track))
      .filter((track) => isFreshTrack(track, recentIds));
  }

  if (!candidates.length) {
    candidates = dedupeTracks(BTS_FALLBACK_TRACKS).filter((track) => looksLikeBtsAudioTrack(track));
  }

  const aiChoice = await chooseWithOpenAI(candidates, recentIds);
  const track = aiChoice ?? pickRandomTrack(candidates, recentIds);

  if (!track) {
    return Response.json(
      {
        ok: false,
        error: "No BTS track could be selected.",
      },
      {
        status: 404,
      },
    );
  }

  return Response.json({
    ok: true,
    track: {
      videoId: track.videoId,
      title: track.title || "BTS track",
      channelTitle: track.channelTitle || "YouTube",
      publishedAt: track.publishedAt || "",
      source: track.source || "fallback",
    },
  });
}
