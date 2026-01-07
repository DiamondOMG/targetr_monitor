"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";
import { getPlaybackForScreen } from "./actions/screen";

export default function Home() {
  const [data, setData] = useState<unknown>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channelName = "monitor_screen";
    const channel = pusher.subscribe(channelName);

    channel.bind(
      "player-event",
      async (payload: { libraryItemId?: string; screenId?: string }) => {
        setData(payload);

        try {
          const libraryItemId = payload?.libraryItemId;
          const screenId = payload?.screenId;

          if (!libraryItemId || !screenId) {
            setImageUrl(null);
            return;
          }

          const list = (await getPlaybackForScreen(screenId)) as {
            libraryItemId: string;
            blobId: string | null;
          }[];
          const match = Array.isArray(list)
            ? list.find((i) => i.libraryItemId === libraryItemId)
            : null;

          if (match && match.blobId) {
            setImageUrl(`https://d2cep6vins8x6z.blobstore.net/${match.blobId}`);
          } else {
            setImageUrl(null);
          }
        } catch (e) {
          console.error("Error fetching playback:", e);
          setImageUrl(null);
        }
      }
    );

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen p-6 font-mono bg-gray-50">
      <h1 className="text-lg font-semibold mb-4">Pusher Realtime Viewer</h1>
      <div className="bg-white border rounded p-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="screen" className="max-w-full h-auto" />
        ) : (
          <pre className="text-sm overflow-auto">
            {data ? JSON.stringify(data, null, 2) : "Waiting for event..."}
          </pre>
        )}
      </div>
    </main>
  );
}
