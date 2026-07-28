import {
  fetchActivity,
  fetchSlots,
  isBookableNow,
  pickBestSlot,
  slotMatchesCriteria,
  summarizeSlot
} from "./better-api.js";
import { addMatchingSlotToBasket, openLoginSession, openMatchingSlotPage } from "./better-bot.js";
import { loadConfig } from "./config.js";

function printHeader(title) {
  console.log(`\n=== ${title} ===`);
}

function printConfig(config) {
  console.log(`Activity: ${config.activitySlug}`);
  console.log(`Venue: ${config.venueSlug}`);
  console.log(`Dates: ${config.targetDates.join(", ")}`);
  console.log(`Time window: ${minutesToLabel(config.startTimeFrom)}-${minutesToLabel(config.startTimeTo)}`);
  console.log(
    `Preferred courts: ${config.preferredCourts.length > 0 ? config.preferredCourts.join(", ") : "any"}`
  );
}

function minutesToLabel(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function printSlotSummary(slots, config) {
  const summaries = slots
    .filter((slot) => slotMatchesCriteria(slot, config))
    .slice(0, 20)
    .map((slot) => summarizeSlot(slot, config));

  if (summaries.length === 0) {
    console.log("No slots matched current criteria.");
    return;
  }

  console.table(summaries);
}

async function gather(config) {
  const [activity, slots] = await Promise.all([fetchActivity(config), fetchSlots(config)]);
  return { activity, slots };
}

async function runProbe(config) {
  const { activity, slots } = await gather(config);

  printHeader("Config");
  printConfig(config);

  printHeader("Activity");
  console.log(`${activity.name} with ${activity.locations.length} courts`);

  printHeader("Matching Slots");
  printSlotSummary(slots, config);

  const available = slots.filter((slot) => slotMatchesCriteria(slot, config) && isBookableNow(slot));
  const best = pickBestSlot(available, config);

  printHeader("Best Candidate");
  if (!best) {
    console.log("No bookable slot right now.");
    return;
  }

  console.table([summarizeSlot(best, config)]);
}

async function runPrepare(config) {
  const { slots } = await gather(config);
  const available = slots.filter((slot) => slotMatchesCriteria(slot, config) && isBookableNow(slot));
  const best = pickBestSlot(available, config);

  if (!best) {
    throw new Error("No bookable slot matched current criteria.");
  }

  console.table([summarizeSlot(best, config)]);
  await openMatchingSlotPage(best, config);
}

async function runBasket(config) {
  const { slots } = await gather(config);
  const available = slots.filter((slot) => slotMatchesCriteria(slot, config) && isBookableNow(slot));
  const best = pickBestSlot(available, config);

  if (!best) {
    throw new Error("No bookable slot matched current criteria.");
  }

  console.table([summarizeSlot(best, config)]);
  await addMatchingSlotToBasket(best, config);
}

async function runWatch(config) {
  const best = await waitForBookableSlot(config);
  await openMatchingSlotPage(best, config);
}

async function runWatchBasket(config) {
  const best = await waitForBookableSlot(config);
  await addMatchingSlotToBasket(best, config);
}

async function waitForBookableSlot(config) {
  printHeader("Watch");
  printConfig(config);

  for (;;) {
    const slots = await fetchSlots(config);
    const available = slots.filter((slot) => slotMatchesCriteria(slot, config) && isBookableNow(slot));
    const best = pickBestSlot(available, config);

    if (best) {
      console.log("Bookable slot found.");
      console.table([summarizeSlot(best, config)]);
      return best;
    }

    const matching = slots.filter((slot) => slotMatchesCriteria(slot, config));
    const firstRelease = matching
      .map((slot) => slot.first_bookable_at?.local)
      .filter(Boolean)
      .sort()[0];

    console.log(
      `No bookable slot yet. Matching slots visible: ${matching.length}. ` +
      `Next release sample: ${firstRelease ?? "unknown"}. Sleeping ${config.pollIntervalMs}ms.`
    );

    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }
}

async function main() {
  const mode = process.argv[2];
  const config = loadConfig();

  switch (mode) {
    case "probe":
      await runProbe(config);
      return;
    case "login":
      await openLoginSession(config);
      return;
    case "prepare":
      await runPrepare(config);
      return;
    case "basket":
      await runBasket(config);
      return;
    case "watch":
      await runWatch(config);
      return;
    case "watch-basket":
      await runWatchBasket(config);
      return;
    default:
      throw new Error("Usage: node src/cli.js [probe|login|prepare|basket|watch|watch-basket]");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
