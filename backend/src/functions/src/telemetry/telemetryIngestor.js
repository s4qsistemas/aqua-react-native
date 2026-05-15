'use strict';

const { requireField } = require('../shared/envelope');

function normalizeTelemetryEvent(event, receivedAt) {
    const tenantId = requireField(event.tenant_id, 'tenant_id');
    return {
        id: requireField(event.message_id || event.id, 'id'),
        tenant_id: tenantId,
        site_id: requireField(event.site_id, 'site_id'),
        device_id: requireField(event.device_id || event.gateway_id, 'device_id'),
        sensor_id: requireField(event.sensor_id, 'sensor_id'),
        metric: requireField(event.metric, 'metric'),
        unit: requireField(event.unit, 'unit'),
        value: Number(requireField(event.value, 'value')),
        captured_at: requireField(event.timestamp, 'timestamp'),
        ingested_at: receivedAt
    };
}

function ingestTelemetry(events, now = () => new Date().toISOString()) {
    const receivedAt = now();
    return events.map((event) => normalizeTelemetryEvent(event, receivedAt));
}

module.exports = {
    ingestTelemetry,
    normalizeTelemetryEvent
};