"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";
import { bulk_data_update, playback_screen_by_id } from "./actions/screen";

export default function Home() {
  const [input_screens, set_input_screens] = useState<string>("");
  const [screens_event, set_screens_event] = useState<string[]>([]);
  const [is_loading, set_is_loading] = useState<boolean>(false);
  const [selected_screen, set_selected_screen] = useState<
    (typeof array_playback_screen)[0] | null
  >(null);
  const [array_playback_screen, set_array_playback_screen] = useState<
    {
      screen_id: string;
      last_library_item_id?: string;
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

    set_is_loading(true);
    try {
      // 1. Update dpop endpoint
      await bulk_data_update(
        ids,
        "https://targetr-monitor.vercel.app/api/pusher",
        "SHORT"
      );

      // 2. Fetch playback data
      const all_playbacks = await Promise.all(
        ids.map(async (id) => {
          const list = (await playback_screen_by_id(id)) as {
            screenId: string;
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
    } finally {
      set_is_loading(false);
    }
  };

  const handle_clear_screens = async () => {
    if (screens_event.length === 0) {
      set_array_playback_screen([]);
      return;
    }

    try {
      // 1. Clear dpop endpoint using screens_event
      await bulk_data_update(screens_event, "", "");

      // 2. Clear state
      set_array_playback_screen([]);
      set_screens_event([]);
    } catch (error) {
      console.error("Error clearing screens:", error);
    }
  };

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_PUSHER_KEY ||
      !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    )
      return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channelName = "monitor_screen";
    const channel = pusher.subscribe(channelName);

    channel.bind(
      "player-event",
      (payload: { libraryItemId?: string; screenId?: string }) => {
        console.log("Received event (player-event):", payload);
        const library_item_id = payload?.libraryItemId;
        const screen_id = payload?.screenId;

        if (!library_item_id || !screen_id) return;

        set_screens_event((prev) =>
          prev.includes(screen_id) ? prev : [...prev, screen_id]
        );

        set_array_playback_screen((prev) =>
          prev.map((s) => {
            if (s.screen_id === screen_id) {
              const match = s.playback_list.find(
                (i) => i.libraryItemId === library_item_id
              );
              return {
                ...s,
                last_library_item_id: library_item_id,
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
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={input_screens}
              onChange={(e) => set_input_screens(e.target.value)}
              placeholder="e.g. 0200068F2535 0200068F2536"
              className="flex-1 border rounded px-3 py-2 bg-white min-w-0"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handle_load_screens}
                disabled={is_loading || !input_screens.trim()}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors whitespace-nowrap disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {is_loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Loading...</span>
                  </>
                ) : (
                  "Monitor Screens"
                )}
              </button>
              {screens_event.length > 0 && (
                <button
                  onClick={handle_clear_screens}
                  className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                  Clear ({screens_event.length})
                </button>
              )}
            </div>
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
            {/* Header: Screen ID อยู่บนรูป */}
            <div className="px-3 py-2 border-b bg-gray-50 flex justify-between items-center">
              <div className="text-sm font-bold text-gray-800">
                {screen.screen_id}
              </div>
              <button
                onClick={() => set_selected_screen(screen)}
                className="text-[10px] bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-100 transition-colors font-bold uppercase text-gray-600"
              >
                Playback
              </button>
            </div>

            <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
              {screen.current_playback?.blobId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://d2cep6vins8x6z.blobstore.net/${screen.current_playback.blobId}`}
                  alt={screen.screen_id}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-sm">
                  Waiting for event...
                </div>
              )}
            </div>

            {/* Footer: Library Item ID และ Label อยู่ด้านล่าง */}
            <div className="p-3 border-t bg-white mt-auto">
              <div className="text-xs font-mono text-blue-600 truncate mb-1">
                {screen.last_library_item_id || "Waiting for ID..."}
              </div>
              <div className="text-sm font-medium text-gray-800 truncate">
                {screen.current_playback?.label || "Unknown"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Playback Modal */}
      {selected_screen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Playback List
                </h2>
                <p className="text-xs text-gray-500 font-mono">
                  {selected_screen.screen_id}
                </p>
              </div>
              <button
                onClick={() => set_selected_screen(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body: Scrollable Grid */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {selected_screen.playback_list.map((item, index) => (
                  <div
                    key={`${item.libraryItemId}-${index}`}
                    className="bg-white border rounded overflow-hidden flex flex-col hover:border-blue-300 transition-colors group"
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                      {item.blobId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://d2cep6vins8x6z.blobstore.net/${item.blobId}`}
                          alt={item.label}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-[10px] text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-white flex-1 border-t">
                      <div className="text-[10px] font-mono text-blue-600 truncate mb-0.5 group-hover:text-blue-700">
                        {item.libraryItemId}
                      </div>
                      <div className="text-[10px] text-gray-600 truncate leading-tight">
                        {item.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={() => set_selected_screen(null)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
