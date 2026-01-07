"use server";

import { axios_targetr } from "../../lib/axios";

interface PlaybackData {
  result: {
    item: {
      data: { libraryItemId: string };
      resources: {
        data: { width: string; blobId: string };
      }[];
    };
  }[];
}

export async function screen_by_id(screen_id: string) {
  const response = await axios_targetr.get(`/rest-api/v1/screens/${screen_id}`);
  return response.data;
}

export async function playback_screen_by_id(screen_id: string) {
  const { data } = await axios_targetr.get<PlaybackData>(
    `/api/simulate-screen/${screen_id}`
  );

  return data.result.map((entry) => {
    const resource = entry.item.resources.find((r) => r.data.width === "200");

    return {
      libraryItemId: entry.item.data.libraryItemId,
      blobId: resource?.data.blobId ?? null,
    };
  });
}

export async function getPlaybackForScreen(screenId: string) {
  return await playback_screen_by_id(screenId);
}
