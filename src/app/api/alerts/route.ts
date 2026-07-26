import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const search = searchParams.get("search");

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { entity: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        entity: true,
        assignedTo: true,
        anomalyPrediction: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(alerts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { alertIds, status, assignedToId } = body;

    if (!alertIds || !Array.isArray(alertIds)) {
      return NextResponse.json({ error: "Invalid alertIds array" }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (assignedToId !== undefined) data.assignedToId = assignedToId;

    await prisma.alert.updateMany({
      where: { id: { in: alertIds } },
      data
    });

    // Record bulk activity
    const activities = alertIds.map(id => ({
      alertId: id,
      type: "STATUS_CHANGE",
      content: `Bulk updated: ${status ? 'Status to ' + status : ''} ${assignedToId ? 'Assigned' : ''}`
    }));

    await prisma.alertActivity.createMany({
      data: activities
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
