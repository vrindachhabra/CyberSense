import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const run = await prisma.trainingRun.findUnique({
      where: { id },
      include: { modelVersion: true }
    });

    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Simulate progress if still training
    if (run.status === "TRAINING") {
      const now = new Date();
      const diffSeconds = (now.getTime() - new Date(run.startedAt).getTime()) / 1000;
      
      const totalEpochs = 50;
      let currentEpoch = Math.floor(diffSeconds * 2); // 2 epochs per second (mock)
      
      if (currentEpoch >= totalEpochs) {
        // Complete training
        const metrics = {
          precision: 85 + Math.random() * 10,
          recall: 80 + Math.random() * 15,
          f1: 82 + Math.random() * 12,
          accuracy: 90 + Math.random() * 8
        };

        await prisma.modelVersion.update({
          where: { id: run.modelVersionId },
          data: { status: "RETIRED", metrics }
        });

        await prisma.trainingRun.update({
          where: { id: run.id },
          data: { status: "RETIRED", completedAt: new Date() }
        });

        return NextResponse.json({
          status: "RETIRED",
          progress: 100,
          logs: { steps: [{ epoch: totalEpochs, loss: 0.1, message: "Training complete. Model saved." }] }
        });
      }

      // Generate mock loss curve
      const baseLoss = 1.0;
      const currentLoss = baseLoss * Math.exp(-currentEpoch / 10) + (Math.random() * 0.05);
      
      const newLogs = {
        steps: [
          { epoch: currentEpoch, loss: currentLoss.toFixed(4), message: `Training epoch ${currentEpoch}/${totalEpochs}` }
        ]
      };

      await prisma.trainingRun.update({
        where: { id: run.id },
        data: { logs: newLogs }
      });

      return NextResponse.json({
        status: "TRAINING",
        progress: (currentEpoch / totalEpochs) * 100,
        logs: newLogs
      });
    }

    return NextResponse.json({
      status: run.status,
      progress: 100,
      logs: run.logs
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
