export interface TelemetryReading {
    id: string;
    tenant_id: string;
    site_id: string;
    device_id: string;
    sensor_id: string;
    metric: string;
    unit: string;
    value: number;
    captured_at: string;
    ingested_at: string;
}

export function ingestTelemetry(events: any[], now?: () => string): TelemetryReading[];
export function normalizeTelemetryEvent(event: any, receivedAt: string): TelemetryReading;
