import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { modelVersionId } = body;

    if (!modelVersionId) {
      return NextResponse.json({ error: "Missing modelVersionId" }, { status: 400 });
    }

    const version = await prisma.modelVersion.findUnique({
      where: { id: modelVersionId }
    });

    if (!version || version.status !== "RETIRED") {
      return NextResponse.json({ error: "Model version must be RETIRED (Trained) before deployment." }, { status: 400 });
    }

    // Demote any previously DEPLOYED versions for this model
    await prisma.modelVersion.updateMany({
      where: { modelId: version.modelId, status: "ACTIVE" },
      data: { status: "RETIRED" } // Demote to trained archive
    });

    // Deploy the new version
    const deployedVersion = await prisma.modelVersion.update({
      where: { id: modelVersionId },
      data: { status: "ACTIVE" }
    });

    return NextResponse.json({ success: true, deployedVersion });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
