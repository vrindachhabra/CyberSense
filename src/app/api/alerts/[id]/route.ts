import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        entity: true,
        assignedTo: true,
        anomalyPrediction: {
          include: {
            modelVersion: true
          }
        },
        activities: {
          include: { user: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    return NextResponse.json(alert);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, assignedToId } = body;
    
    const data: any = {};
    if (status) data.status = status;
    if (assignedToId !== undefined) data.assignedToId = assignedToId;

    const alert = await prisma.alert.update({
      where: { id },
      data
    });

    await prisma.alertActivity.create({
      data: {
        alertId: id,
        type: "STATUS_CHANGE",
        content: `Alert updated: ${status ? status : ''}`
      }
    });

    return NextResponse.json(alert);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
