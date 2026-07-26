import "dotenv/config";
import { BaselineProfiler } from "../src/lib/profiler";
import { prisma } from "../src/lib/prisma";

async function runTest() {
  const entityId = "test-user-123";
  const entityType = "USER";

  // Clean up before test
  await prisma.baselineProfile.deleteMany({ where: { entityId } });
  await prisma.entity.deleteMany({ where: { id: entityId } });

  console.log("Ingesting Log 1 (9:00 AM, US, Chrome, 30m duration)");
  await BaselineProfiler.ingestSession({
    entity_id: entityId,
    entity_type: entityType,
    timestamp: "2026-07-26T09:00:00Z", // 9 AM
    ip: "192.168.1.1",
    geo_location: "US",
    browser: "Chrome",
    resource_accessed: "/api/dashboard",
    session_duration: 30,
  });

  console.log("Ingesting Log 2 (10:00 AM, US, Chrome, 45m duration)");
  await BaselineProfiler.ingestSession({
    entity_id: entityId,
    entity_type: entityType,
    timestamp: "2026-07-26T10:00:00Z", // 10 AM
    ip: "192.168.1.1",
    geo_location: "US",
    browser: "Chrome",
    resource_accessed: "/api/dashboard",
    session_duration: 45,
  });

  console.log("Ingesting Log 3 (8:00 AM, UK, Firefox, 10m duration)");
  await BaselineProfiler.ingestSession({
    entity_id: entityId,
    entity_type: entityType,
    timestamp: "2026-07-26T08:00:00Z", // 8 AM
    ip: "10.0.0.5",
    geo_location: "UK",
    browser: "Firefox",
    resource_accessed: "/api/settings",
    session_duration: 10,
  });

  const profile = await prisma.baselineProfile.findFirst({
    where: { entityId, modelVersionId: null }
  });

  console.log("\nFinal Calculated Baseline Profile:");
  console.log(JSON.stringify(profile?.features, null, 2));
}

runTest().catch(console.error).finally(() => process.exit(0));
