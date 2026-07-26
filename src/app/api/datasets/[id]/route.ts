import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find the dataset
    const dataset = await prisma.dataset.findUnique({
      where: { id }
    });

    if (!dataset) {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
    }

    // Delete the file from disk if it exists
    const filepath = path.join(process.cwd(), ".data/uploads", dataset.filename);
    try {
      await unlink(filepath);
    } catch (fsError: any) {
      console.warn("Could not delete file from disk, it may have already been removed:", fsError.message);
    }

    // Delete the DB record
    await prisma.dataset.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Dataset delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
