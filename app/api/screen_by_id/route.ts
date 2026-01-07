import { screen_by_id } from "../../actions/screen";

export async function GET() {
  try {
    const data = await screen_by_id("0200068F2535");
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching screen:", error);
    return Response.json({ error: "Failed to fetch screen" }, { status: 500 });
  }
}
