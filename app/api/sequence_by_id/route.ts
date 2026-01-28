import { sequence_by_id } from "../../actions/sequence";

export async function GET() {
  try {
    const data = await sequence_by_id("13BA3FC3883148");
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching sequence:", error);
    return Response.json({ error: "Failed to fetch sequence" }, { status: 500 });
  }
}
