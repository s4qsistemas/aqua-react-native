'use strict';

const { app } = require('@azure/functions');
const { ingestTelemetry } = require('../telemetry/telemetryIngestor');
const { cosmos } = require('../clients/cosmos');
const { blob } = require('../clients/blob');

async function handler(events, context) {
  const records = ingestTelemetry(events.map(e => e.body));
  await Promise.all(records.map(r => cosmos.telemetry.items.upsert(r)));
  for (const r of records) {
    const blobName = `${r.tenant_id}/${r.device_id}/${r.captured_at.slice(0, 10)}.jsonl`;
    const line = JSON.stringify(r) + '\n';
    const appendClient = blob.telemetryHistory.getAppendBlobClient(blobName);
    await appendClient.createIfNotExists();
    await appendClient.appendBlock(line, Buffer.byteLength(line));
  }
}

app.eventHub('TelemetryIngestor', {
  connection: 'IOTHUB_EVENTHUB_ENDPOINT',
  eventHubName: 'messages/events',
  consumerGroup: 'telemetry-ingestor',
  cardinality: 'many',
  handler
});

module.exports = { handler };
