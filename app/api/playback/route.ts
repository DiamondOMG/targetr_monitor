import { playback } from "../../actions/playback";

export async function GET() {
  try {
    const data = await playback("0200458A9F94");
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching playback:", error);
    return Response.json({ error: "Failed to fetch playback" }, { status: 500 });
  }
}
