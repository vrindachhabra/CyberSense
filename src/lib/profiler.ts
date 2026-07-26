import { prisma } from "@/lib/prisma";

export type AccessLogPayload = {
  entity_id: string;
  entity_type: string; // "USER", "DEVICE", etc.
  timestamp: string; // ISO date string
  ip?: string;
  geo_location?: string;
  device_fingerprint?: string;
  os?: string;
  browser?: string;
  resource_accessed?: string;
  http_method?: string;
  authentication_method?: string;
  session_duration?: number;
  command_sequence?: string;
};

// EMA weight - determining how quickly the baseline adapts to new behavior
// Higher alpha (e.g., 0.3) adapts faster. Lower alpha (e.g., 0.05) is more resistant to spikes.
const EMA_ALPHA = 0.1;

export class BaselineProfiler {
  /**
   * Ingests a normal session log and updates the corresponding entity's baseline profile.
   */
  static async ingestSession(log: AccessLogPayload) {
    if (!log.entity_id || !log.entity_type) {
      throw new Error("Missing entity_id or entity_type");
    }

    // Ensure the Entity exists in the database
    // Using an upsert to guarantee it exists before we attach a profile to it
    const entity = await prisma.entity.upsert({
      where: { id: log.entity_id },
      update: {},
      create: {
        id: log.entity_id,
        // map type appropriately, default to USER if unknown enum mapping
        type: log.entity_type === 'DEVICE' ? 'DEVICE' : 
              log.entity_type === 'NETWORK' ? 'NETWORK' : 
              log.entity_type === 'APPLICATION' ? 'APPLICATION' : 'USER',
        name: `Entity ${log.entity_id}`,
      }
    });

    // Find the active generic baseline profile (where modelVersionId is null)
    let profile = await prisma.baselineProfile.findFirst({
      where: {
        entityId: entity.id,
        modelVersionId: null as any
      }
    });

    let features: Record<string, any> = {};
    if (profile && profile.features) {
      features = profile.features as Record<string, any>;
    } else {
      features = this.initializeFeatures();
    }

    // Update Numerical Features using Exponential Moving Average (EMA)
    const logDate = new Date(log.timestamp);
    const loginHour = logDate.getHours() + (logDate.getMinutes() / 60.0);
    features.avg_login_hour = this.updateEMA(features.avg_login_hour, loginHour);

    if (log.session_duration !== undefined && log.session_duration !== null) {
      features.avg_session_duration = this.updateEMA(features.avg_session_duration, log.session_duration);
    }

    // Update Categorical Features (Frequency Maps)
    if (log.geo_location) features.locations = this.incrementFrequency(features.locations, log.geo_location);
    if (log.ip) features.ips = this.incrementFrequency(features.ips, log.ip);
    if (log.resource_accessed) features.resources = this.incrementFrequency(features.resources, log.resource_accessed);
    if (log.authentication_method) features.auth_methods = this.incrementFrequency(features.auth_methods, log.authentication_method);
    if (log.command_sequence) features.command_sequences = this.incrementFrequency(features.command_sequences, log.command_sequence);
    if (log.device_fingerprint) features.device_fingerprints = this.incrementFrequency(features.device_fingerprints, log.device_fingerprint);

    // Save back to DB
    if (profile) {
      await prisma.baselineProfile.update({
        where: { id: profile.id },
        data: { features }
      });
    } else {
      await prisma.baselineProfile.create({
        data: {
          entityId: entity.id,
          modelVersionId: null as any,
          features
        }
      });
    }
  }

  private static initializeFeatures() {
    return {
      avg_login_hour: null,
      avg_session_duration: null,
      locations: {},
      ips: {},
      resources: {},
      auth_methods: {},
      command_sequences: {},
      device_fingerprints: {},
    };
  }

  private static updateEMA(currentEMA: number | null, newValue: number): number {
    if (currentEMA === null) return newValue;
    return (EMA_ALPHA * newValue) + ((1 - EMA_ALPHA) * currentEMA);
  }

  private static incrementFrequency(map: Record<string, number>, key: string): Record<string, number> {
    if (!map) map = {};
    if (!map[key]) {
      map[key] = 0;
    }
    map[key]++;
    return map;
  }
}
