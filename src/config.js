import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

function readString(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readBoolean(name, fallback = false) {
  const value = readString(name);
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readNumber(name, fallback) {
  const raw = readString(name, "");
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readList(name) {
  return readString(name)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseTimeToMinutes(value) {
  if (!value) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid time for value "${value}". Expected HH:MM.`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

function todayInTimeZone(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildDateRange(startDate, endDate) {
  const dates = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function buildTargetDates(timeZone) {
  const targetDates = readList("TARGET_DATES");
  if (targetDates.length > 0) {
    return targetDates;
  }

  const today = todayInTimeZone(timeZone);
  const defaultDaysAhead = readNumber("TARGET_DAYS_AHEAD", 5);
  const startDaysAhead = readNumber("TARGET_DAYS_AHEAD_FROM", defaultDaysAhead);
  const endDaysAhead = readNumber("TARGET_DAYS_AHEAD_TO", startDaysAhead);

  if (!Number.isInteger(startDaysAhead) || !Number.isInteger(endDaysAhead)) {
    throw new Error("TARGET_DAYS_AHEAD_FROM and TARGET_DAYS_AHEAD_TO must be whole numbers.");
  }

  if (startDaysAhead < 0 || endDaysAhead < startDaysAhead) {
    throw new Error("TARGET_DAYS_AHEAD range must be zero or greater and ordered from low to high.");
  }

  return buildDateRange(addDays(today, startDaysAhead), addDays(today, endDaysAhead));
}

export function loadConfig() {
  const timeZone = readString("BETTER_TIMEZONE", "Europe/London");
  const venueSlug = readString("BETTER_VENUE_SLUG", "islington-tennis-centre");
  const activitySlug = readString("BETTER_ACTIVITY_SLUG", "highbury-tennis");

  return {
    baseWebUrl: "https://bookings.better.org.uk",
    baseApiUrl: "https://better-admin.org.uk/api",
    clientDomainIdentifier: "better-admin.org.uk",
    venueSlug,
    activitySlug,
    timeZone,
    targetDates: buildTargetDates(timeZone),
    startTimeFrom: parseTimeToMinutes(readString("START_TIME_FROM", "00:00")),
    startTimeTo: parseTimeToMinutes(readString("START_TIME_TO", "23:59")),
    maxPriceGbp: readNumber("MAX_PRICE_GBP", 999),
    preferredCourts: readList("PREFERRED_COURTS"),
    headless: readBoolean("HEADLESS", false),
    profileDir: path.resolve(process.cwd(), readString("PROFILE_DIR", ".playwright-profile")),
    pollIntervalMs: readNumber("POLL_INTERVAL_MS", 5000)
  };
}
