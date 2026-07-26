import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessLogPayload } from "@/lib/profiler";

export async function POST(req: Request) {
  try {
    const log: AccessLogPayload = await req.json();

    if (!log.entity_id) {
      return NextResponse.json({ error: "Missing entity_id" }, { status: 400 });
    }

    // 1. Fetch Baseline Profile
    const profile = await prisma.baselineProfile.findFirst({
      where: {
        entityId: log.entity_id,
        modelVersionId: null
      }
    });

    if (!profile) {
      return NextResponse.json({ error: "No baseline profile found for entity. Train baseline first." }, { status: 400 });
    }

    const features = profile.features as Record<string, any>;

    // 2. Feature Engineering (Deviation Calculation)
    let login_time_deviation = 0.0;
    let duration_deviation = 0.0;
    let is_new_ip = 0.0;
    let is_new_location = 0.0;
    let is_new_resource = 0.0;

    // Time deviation (handling midnight wrap-around)
    if (log.timestamp && features.avg_login_hour !== undefined && features.avg_login_hour !== null) {
      const logDate = new Date(log.timestamp);
      const loginHour = logDate.getHours() + (logDate.getMinutes() / 60.0);
      const diff = Math.abs(loginHour - features.avg_login_hour);
      // Min diff considering 24hr cycle
      login_time_deviation = Math.min(diff, 24 - diff);
    }

    // Duration deviation
    if (log.session_duration !== undefined && features.avg_session_duration !== undefined && features.avg_session_duration !== null) {
      duration_deviation = Math.abs(log.session_duration - features.avg_session_duration);
    }

    // Categorical checks
    if (log.ip && features.ips) {
      is_new_ip = features.ips[log.ip] ? 0.0 : 1.0;
    }
    
    if (log.geo_location && features.locations) {
      is_new_location = features.locations[log.geo_location] ? 0.0 : 1.0;
    }

    if (log.resource_accessed && features.resources) {
      is_new_resource = features.resources[log.resource_accessed] ? 0.0 : 1.0;
    }

    const featurePayload = {
      login_time_deviation,
      duration_deviation,
      is_new_ip,
      is_new_location,
      is_new_resource
    };

    // 3. Call Python ML Engine via HTTP
    // In production, this URL would be from an env var. Here we assume localhost:8000
    const mlResponse = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(featurePayload)
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      console.error("ML Engine Error:", errText);
      return NextResponse.json({ error: "ML Engine prediction failed" }, { status: 500 });
    }

    const prediction = await mlResponse.json();

    // 4. Save Prediction to Database
    const savedPrediction = await prisma.anomalyPrediction.create({
      data: {
        entityId: log.entity_id,
        modelVersionId: null, // Optional for generic/live engine output
        score: prediction.risk_score,
        isAnomaly: prediction.is_anomaly,
        features: {
          top_contributing_features: prediction.top_contributing_features,
          human_readable_explanation: prediction.human_readable_explanation
        },
        timestamp: new Date(log.timestamp || Date.now())
      }
    });

    // 5. Return Results
    return NextResponse.json({
      original_log: log,
      engineered_features: featurePayload,
      prediction: {
        ...prediction,
        prediction_id: savedPrediction.id
      }
    });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
