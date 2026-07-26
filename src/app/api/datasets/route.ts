import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import Papa from "papaparse";
import fs from "fs";

export async function POST(req: Request) {
  try {
    // Hackathon mode: Bypass authentication
    // const userId = "hackathon-judge-id";
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), ".data/uploads");
    await mkdir(uploadDir, { recursive: true });
    
    // Save file
    const uniqueFilename = `${Date.now()}-${file.name}`;
    const filepath = path.join(uploadDir, uniqueFilename);
    await writeFile(filepath, buffer);

    // Parse CSV to calculate statistics using streaming to avoid memory crash
    let rowCount = 0;
    let columnCount = 0;
    let missingValues = 0;
    let anomalyCount = 0;
    const dataTypes: Record<string, string> = {};
    let columns: string[] = [];

    await new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filepath);
      Papa.parse(fileStream, {
        header: true,
        skipEmptyLines: true,
        step: function(result) {
          if (rowCount === 0) {
            columns = result.meta.fields || [];
            columnCount = columns.length;
            const data = result.data as Record<string, any>;
            columns.forEach(col => {
              dataTypes[col] = typeof data[col];
            });
          }

          const row = result.data as any;
          columns.forEach(col => {
            if (row[col] === null || row[col] === undefined || row[col] === "") {
              missingValues++;
            }
          });

          if (row.label == 1 || row.label == '1') {
            anomalyCount++;
          }
          rowCount++;
        },
        complete: function() {
          resolve(true);
        },
        error: function(err) {
          reject(err);
        }
      });
    });

    const anomalyPercentage = rowCount > 0 ? (anomalyCount / rowCount) * 100 : 0;

    // Create DB Record
    const dataset = await prisma.dataset.create({
      data: {
        name: file.name,
        filename: uniqueFilename,
        sizeBytes: file.size,
        rowCount,
        columnCount,
        missingValues,
        anomalyPercentage,
        dataTypes: dataTypes,
        // uploadedById: userId, // Link to uploaded user if session exists
      }
    });

    return NextResponse.json(dataset);
  } catch (error: any) {
    console.error("Dataset upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const datasets = await prisma.dataset.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(datasets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
