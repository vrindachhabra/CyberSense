import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const LOCATIONS = ["US", "UK", "IN", "DE", "FR", "BR", "JP", "AU"];
const RESOURCES = ["/api/login", "/dashboard", "/api/settings", "/admin/billing", "/api/data/export"];
const IPS = ["192.168.1.10", "10.0.0.5", "172.16.0.22", "8.8.8.8", "203.0.113.5"];

// Simple helper to pick random item
const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

export async function POST() {
  try {
    // 1. Fetch a random entity to attach logs to
    const entities = await prisma.entity.findMany({ take: 10 });
    if (entities.length === 0) {
      return NextResponse.json({ error: "No entities found to simulate traffic against." }, { status: 400 });
    }

    // Generate 1-3 logs
    const numLogs = Math.floor(Math.random() * 3) + 1;
    const generatedLogs = [];

    for (let i = 0; i < numLogs; i++) {
      const entity = pick(entities);
      const isAnomaly = Math.random() > 0.85; // 15% chance of anomaly
      
      const log = {
        entity_id: entity.id,
        entity_type: entity.type,
        timestamp: new Date().toISOString(),
        ip: isAnomaly ? "1.1.1.1" : pick(IPS),
        geo_location: isAnomaly ? "RU" : pick(LOCATIONS),
        device_fingerprint: `device_${Math.floor(Math.random() * 100)}`,
        os: "Windows",
        browser: "Chrome",
        resource_accessed: isAnomaly ? "/admin/billing" : pick(RESOURCES),
        http_method: "GET",
        auth_method: "JWT",
        session_duration: isAnomaly ? Math.random() * 500 : Math.random() * 30, // massive duration spike
        command_sequence: isAnomaly ? "su - root" : "view_dashboard",
      };

      // Since the Python ML Engine is not available in all environments, 
      // the simulator will directly mock the inference loop and write to the DB.
      
      let score = isAnomaly ? 65 + Math.random() * 30 : 10 + Math.random() * 20;
      let classification = "Normal";
      let explanationParts = [];
      let contrib = {};

      if (isAnomaly) {
        if (log.geo_location === "RU") {
          classification = "Impossible Travel";
          explanationParts.push("login originated from a high-risk location (RU)");
          contrib = { ...contrib, is_new_location: 1.0 };
        } else if (log.resource_accessed === "/admin/billing") {
          classification = "Privilege Escalation";
          explanationParts.push("accessed restricted billing resources");
          contrib = { ...contrib, is_new_resource: 1.0 };
        } else {
          classification = "Suspicious Behaviour";
          explanationParts.push("session duration deviated heavily from baseline");
          contrib = { ...contrib, duration_deviation: 450.0 };
        }
      }

      const human_explanation = isAnomaly 
        ? `Flagged as ${classification} because ${explanationParts.join(" and ")}.`
        : "Session appears normal matching established baseline patterns.";

      // 2. Save Prediction to Database
      const prediction = await prisma.anomalyPrediction.create({
        data: {
          entityId: log.entity_id,
          modelVersionId: null,
          score: score,
          isAnomaly: isAnomaly,
          features: {
            top_contributing_features: contrib,
            human_readable_explanation: human_explanation,
            attack_classification: classification
          },
          timestamp: new Date(log.timestamp)
        },
        include: { entity: true }
      });

      // 3. Trigger Alert if Anomalous
      if (isAnomaly) {
        await prisma.alert.create({
          data: {
            title: `High Risk: ${classification} detected on ${entity.name}`,
            description: human_explanation,
            severity: score > 85 ? "CRITICAL" : "HIGH",
            status: "OPEN",
            entityId: entity.id,
            anomalyPredictionId: prediction.id
          }
        });
      }
      
      generatedLogs.push(prediction);
    }

    return NextResponse.json({ success: true, logsGenerated: generatedLogs.length, logs: generatedLogs });

  } catch (error: any) {
    console.error("Simulation Tick Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
