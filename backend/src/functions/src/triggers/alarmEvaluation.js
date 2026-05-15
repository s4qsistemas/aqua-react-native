'use strict';

const { app } = require('@azure/functions');
const { v4: uuidv4 } = require('uuid');
const { evaluateAlarm } = require('../alarms/alarmEvaluation');
const { cosmos } = require('../clients/cosmos');
const { serviceBus } = require('../clients/serviceBus');

const idFactory = (prefix) => `${prefix}-${uuidv4()}`;
const now = () => new Date().toISOString();

async function handler(documents, context) {
  for (const telemetry of documents) {
    const { resource: sensor } = await cosmos.sensors
      .item(telemetry.sensor_id, telemetry.tenant_id).read();
    if (!sensor) {
      context.warn(`sensor ${telemetry.sensor_id} not found, skipping`);
      continue;
    }
    const result = evaluateAlarm({ telemetry, sensor, idFactory, now });
    if (!result) continue;
    await cosmos.alarms.items.upsert(result.alarm);
    await serviceBus.alarmEvents.sendMessages({ body: result.event });
  }
}

app.cosmosDB('AlarmEvaluation', {
  connection: 'COSMOS_CONNECTION_STRING',
  databaseName: 'aquasyncpro',
  containerName: 'telemetry',
  leaseContainerName: 'leases',
  createLeaseContainerIfNotExists: true,
  handler
});

module.exports = { handler };
