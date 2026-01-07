"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";

export default function Home() {
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    const pusher = new Pusher(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      }
    );

    const channelName = "screen-0200068F2535";
    const channel = pusher.subscribe(channelName);

    channel.bind("player-event", (payload: unknown) => {
      setData(payload);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen p-6 font-mono bg-gray-50">
      <h1 className="text-lg font-semibold mb-4">
        Pusher Realtime Viewer
      </h1>

      <div className="bg-white border rounded p-4">
        <div className="text-sm text-gray-500 mb-2">
          Channel: <b>screen-0200068F2535</b><br />
          Event: <b>player-event</b>
        </div>

        <pre className="text-sm overflow-auto">
{data
  ? JSON.stringify(data, null, 2)
  : "Waiting for event..."}
        </pre>
      </div>
    </main>
  );
}
