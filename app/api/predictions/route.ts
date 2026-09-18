import { NextRequest, NextResponse } from "next/server";
import { 
  getServerPredictions, 
  saveServerPrediction, 
  deleteServerPrediction,
  normalizePredictionId 
} from "@/lib/serverPredictionStore";
import { StoredPredictionRecord } from "@/lib/predictionStorage";

export async function GET(req: NextRequest) {
  try {
    const records = getServerPredictions();
    return NextResponse.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("[Predictions API] Failed to get predictions:", error);
    return NextResponse.json({ error: "Failed to load predictions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = null;
    try {
      const text = await req.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || !body.date || !body.reunion || !body.course || !Array.isArray(body.prediction)) {
      return NextResponse.json({ error: "Invalid prediction record" }, { status: 400 });
    }

    const saved = saveServerPrediction(body as StoredPredictionRecord);
    return NextResponse.json({
      success: true,
      record: saved,
    });
  } catch (error) {
    console.error("[Predictions API] Failed to save prediction:", error);
    return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const deleted = deleteServerPrediction(id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error("[Predictions API] Failed to delete prediction:", error);
    return NextResponse.json({ error: "Failed to delete prediction" }, { status: 500 });
  }
}
