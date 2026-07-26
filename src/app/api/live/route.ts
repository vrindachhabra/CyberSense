import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Live Feed (Last 20 predictions)
    const recentPredictions = await prisma.anomalyPrediction.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: { entity: true }
    });

    // 2. Risk Changes (Average score of the last 50 events vs the 50 before that, or just simple recent average)
    // For simplicity in the dashboard, we'll return the last 15 scores to build a sparkline/gauge
    const recentScores = await prisma.anomalyPrediction.findMany({
      orderBy: { timestamp: 'desc' },
      take: 15,
      select: { score: true, timestamp: true }
    });
    
    // Average of last 15
    const currentAvgRisk = recentScores.length > 0 
      ? recentScores.reduce((acc, curr) => acc + curr.score, 0) / recentScores.length
      : 0;

    // 3. New Alerts Count
    const unresolvedAlertsCount = await prisma.alert.count({
      where: {
        status: { in: ["OPEN", "INVESTIGATING"] }
      }
    });

    return NextResponse.json({
      feed: recentPredictions,
      currentRiskAvg: currentAvgRisk,
      riskHistory: recentScores.reverse(), // oldest to newest for charting
      unresolvedAlertsCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
