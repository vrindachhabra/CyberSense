import { NextResponse } from "next/server";
import { BaselineProfiler, AccessLogPayload } from "@/lib/profiler";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const log: AccessLogPayload = await req.json();

    // In a real system, you would first validate the log shape and authenticate the request.
    // Ensure minimal required fields are present
    if (!log.entity_id || !log.entity_type || !log.timestamp) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Store the raw log in PostgreSQL
    await prisma.accessLog.create({
      data: {
        timestamp: new Date(log.timestamp),
        action: log.http_method === 'POST' ? 'CREATE' : 'READ', // Naive mapping
        resource: log.resource_accessed || "unknown",
        ipAddress: log.ip,
        details: {
          geo_location: log.geo_location,
          device_fingerprint: log.device_fingerprint,
          os: log.os,
          browser: log.browser,
          authentication_method: log.authentication_method,
          session_duration: log.session_duration,
          command_sequence: log.command_sequence
        }
      }
    });

    // 2. Trigger Baseline Profiling Engine (only for normal sessions)
    // We assume the payload might include a "label" if it's pre-classified, otherwise assume normal for ingestion
    const isAnomaly = (log as any).label === 1 || (log as any).label === "1";
    
    if (!isAnomaly) {
      // Run the profiler to update the entity's baseline
      await BaselineProfiler.ingestSession(log);
    }

    return NextResponse.json({ success: true, processed: true, updated_baseline: !isAnomaly });
  } catch (error: any) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
