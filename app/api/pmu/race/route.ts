import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // DDMMYYYY
  const reunion = searchParams.get("reunion"); // e.g. R1
  const course = searchParams.get("course"); // e.g. C1

  if (!date || !reunion || !course) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const resInfo = await fetch(`https://turfinfo.api.pmu.fr/rest/client/1/programme/${date}/${reunion}/${course}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 60 }
    });

    const resParticipants = await fetch(`https://turfinfo.api.pmu.fr/rest/client/1/programme/${date}/${reunion}/${course}/participants`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 60 }
    });

    if (!resInfo.ok || !resParticipants.ok) {
      return NextResponse.json({ error: "Failed to fetch race data" }, { status: 502 });
    }

    const info = await resInfo.json();
    const participants = await resParticipants.json();

    return NextResponse.json({ info, participants: participants.participants || [] });
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
