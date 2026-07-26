import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { algorithm, datasetId, name } = body;

    if (!algorithm || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find or create Model
    let model = await prisma.model.findFirst({ where: { name, type: algorithm } });
    if (!model) {
      model = await prisma.model.create({
        data: { name, type: algorithm, description: `Automated ${algorithm} anomaly model` }
      });
    }

    // Determine version
    const existingVersions = await prisma.modelVersion.count({ where: { modelId: model.id } });
    const versionString = `v1.0.${existingVersions + 1}`;

    // Create ModelVersion (TRAINING)
    const modelVersion = await prisma.modelVersion.create({
      data: {
        modelId: model.id,
        versionString,
        status: "TRAINING"
      }
    });

    // Create TrainingRun
    const trainingRun = await prisma.trainingRun.create({
      data: {
        modelVersionId: modelVersion.id,
        status: "TRAINING",
        logs: { steps: [{ epoch: 0, loss: 1.0, message: "Initializing training cluster..." }] }
      }
    });

    // In a real MLOps platform, we would trigger a Celery task or Airflow DAG here.
    // Since we are mocking the backend compute, we will just return success and
    // let a separate polling endpoint simulate the progress.
    return NextResponse.json({ success: true, trainingRunId: trainingRun.id, modelVersionId: modelVersion.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
