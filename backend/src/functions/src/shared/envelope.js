'use strict';

function requireField(value, name) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`missing_${name}`);
  }
  return value;
}

function createServiceBusEnvelope({ messageId, correlationId, messageType, source, tenantId, siteId, timestamp, payload = {} }) {
  return {
    messageId: requireField(messageId, 'messageId'),
    correlationId: requireField(correlationId, 'correlationId'),
    messageType: requireField(messageType, 'messageType'),
    version: '1.0',
    source: requireField(source, 'source'),
    tenant_id: requireField(tenantId, 'tenant_id'),
    site_id: requireField(siteId, 'site_id'),
    timestamp: requireField(timestamp, 'timestamp'),
    payload
  };
}

function assertTenantContext(record, tenantId) {
  if (record.tenant_id !== tenantId) {
    throw new Error('tenant_context_mismatch');
  }
  return record;
}

module.exports = {
  assertTenantContext,
  createServiceBusEnvelope,
  requireField
};
