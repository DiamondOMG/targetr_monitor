"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";
import { bulk_data_update, playback_screen_by_id } from "./actions/screen";

export default function Home() {
  const [input_screens, set_input_screens] = useState<string>("");
  const [array_playback_screen, set_array_playback_screen] = useState<
    {
      screen_id: string;
      playback_list: {
        libraryItemId: string;
        blobId: string | null;
        label: string;
      }[];
      current_playback?: {
        libraryItemId: string;
        blobId: string | null;
        label: string;
      };
    }[]
  >([]);

  const handle_load_screens = async () => {
    const ids = input_screens
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter((id) => id !== "");

    if (ids.length === 0) return;

    try {
      // 1. Update dpop endpoint
      await bulk_data_update(
        ids,
        "https://6fb4de77e6de.ngrok-free.app/api/pusher",
        "SHORT"
      );

      // 2. Fetch playback data
      const all_playbacks = await Promise.all(
        ids.map(async (id) => {
          const list = (await playback_screen_by_id(id)) as {
            libraryItemId: string;
            blobId: string | null;
            label: string;
          }[];
          return {
            screen_id: id,
            playback_list: list,
          };
        })
      );
      set_array_playback_screen(all_playbacks);
      set_input_screens(""); // Clear input after success
    } catch (error) {
      console.error("Error monitoring screens:", error);
    }
  };

  const handle_clear_screens = async () => {
    const ids = array_playback_screen.map((s) => s.screen_id);
    if (ids.length === 0) return;

    try {
      // 1. Clear dpop endpoint
      await bulk_data_update(ids, "", "");

      // 2. Clear state
      set_array_playback_screen([]);
    } catch (error) {
      console.error("Error clearing screens:", error);
    }
  };

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channelName = "monitor_screen";
    const channel = pusher.subscribe(channelName);

    channel.bind(
      "player-event",
      (payload: { libraryItemId?: string; screenId?: string }) => {
        const library_item_id = payload?.libraryItemId;
        const screen_id = payload?.screenId;

        if (!library_item_id || !screen_id) return;

        set_array_playback_screen((prev) =>
          prev.map((s) => {
            if (s.screen_id === screen_id) {
              const match = s.playback_list.find(
                (i) => i.libraryItemId === library_item_id
              );
              return {
                ...s,
                current_playback: match,
              };
            }
            return s;
          })
        );
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

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">
            Screen IDs (comma or space separated)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={input_screens}
              onChange={(e) => set_input_screens(e.target.value)}
              placeholder="e.g. 0200068F2535 0200068F2536"
              className="flex-1 border rounded px-3 py-2 bg-white"
            />
            <button
              onClick={handle_load_screens}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Monitor Screens
            </button>
            {array_playback_screen.length > 0 && (
              <button
                onClick={handle_clear_screens}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Clear Monitor Screens
              </button>
            )}
          </div>
        </div>

        {array_playback_screen.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-500">
              Monitoring:
            </span>
            {array_playback_screen.map((s) => (
              <span
                key={s.screen_id}
                className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold"
              >
                {s.screen_id}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {array_playback_screen.map((screen) => (
          <div
            key={screen.screen_id}
            className="bg-white border rounded overflow-hidden flex flex-col"
          >
            <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
              {screen.current_playback?.blobId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://d2cep6vins8x6z.blobstore.net/${screen.current_playback.blobId}`}
                  alt={screen.screen_id}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-sm">
                  Waiting for event...
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-white mt-auto">
              <div className="text-sm font-medium truncate">
                {screen.screen_id} -{" "}
                <span className="text-gray-600">
                  {screen.current_playback?.label || "Unknown"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
