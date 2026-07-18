const { DateTime } = require('luxon');
const WorkshopSettings = require('../models/WorkshopSettings');
const logger = require('../config/logger');

const DEFAULT_TIMEZONE = 'Africa/Addis_Ababa';

async function getWorkshopTimezone(workshopId) {
  try {
    const settings = await WorkshopSettings.findByWorkshop(workshopId);
    return settings?.timezone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function toWorkshopTime(utcDate, timezone) {
  return DateTime.fromJSDate(new Date(utcDate), { zone: 'utc' }).setZone(timezone);
}

function toUTC(localDateStr, timezone) {
  const dt = DateTime.fromISO(localDateStr, { zone: timezone });
  if (!dt.isValid) {
    logger.warn({ localDateStr, timezone }, 'Invalid date conversion to UTC');
    return null;
  }
  return dt.toUTC().toJSDate();
}

function formatWorkshopTime(utcDate, timezone, format = 'MMM d, yyyy h:mm a') {
  return toWorkshopTime(utcDate, timezone).toFormat(format);
}

module.exports = { getWorkshopTimezone, toWorkshopTime, toUTC, formatWorkshopTime, DEFAULT_TIMEZONE };
