import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = await prisma.model.findMany({
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          include: {
            trainingRuns: {
              orderBy: { startedAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const datasets = await prisma.dataset.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ models, datasets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
