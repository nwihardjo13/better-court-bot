function minutesFromSlot(slot) {
  const [hours, minutes] = slot.starts_at.format_24_hour.split(":").map(Number);
  return hours * 60 + minutes;
}

function priceFromSlot(slot) {
  return Number(slot.price?.raw ?? 0) / 100;
}

function isDateValidationError(payload) {
  return payload?.status === 422 && payload?.errors?.date;
}

export async function fetchJson(url, config) {
  const response = await fetch(url, {
    headers: {
      "Client-Domain-Identifier": config.clientDomainIdentifier
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.message || `Request failed with ${response.status}`);
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function fetchActivity(config) {
  const url =
    `${config.baseApiUrl}/activities/venue/${config.venueSlug}/categories/${config.activitySlug}`;
  const payload = await fetchJson(url, config);
  return payload.data;
}

export async function fetchSlotsForDate(date, config) {
  const url =
    `${config.baseApiUrl}/activities/venue/${config.venueSlug}/activity/${config.activitySlug}/v2/slots?date=${date}`;

  try {
    const payload = await fetchJson(url, config);
    return payload.data;
  } catch (error) {
    if (isDateValidationError(error.payload)) {
      return [];
    }

    throw error;
  }
}

export async function fetchSlots(config) {
  const allSlots = [];

  for (const date of config.targetDates) {
    const slots = await fetchSlotsForDate(date, config);
    allSlots.push(...slots);
  }

  return allSlots;
}

export function isBookableNow(slot) {
  return slot.action_to_show?.status === "BOOK" && slot.spaces > 0;
}

export function slotMatchesCriteria(slot, config) {
  const startMinutes = minutesFromSlot(slot);
  const priceGbp = priceFromSlot(slot);

  if (startMinutes < config.startTimeFrom || startMinutes > config.startTimeTo) {
    return false;
  }

  if (priceGbp > config.maxPriceGbp) {
    return false;
  }

  if (
    config.preferredCourts.length > 0 &&
    !config.preferredCourts.includes(slot.location.slug)
  ) {
    return false;
  }

  return true;
}

function preferredCourtRank(slot, config) {
  if (config.preferredCourts.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  const index = config.preferredCourts.indexOf(slot.location.slug);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function pickBestSlot(slots, config) {
  const candidates = slots.filter((slot) => slotMatchesCriteria(slot, config));
  if (candidates.length === 0) {
    return null;
  }

  return candidates
    .slice()
    .sort((left, right) => {
      const rankDiff = preferredCourtRank(left, config) - preferredCourtRank(right, config);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      const dateDiff = left.date.raw.localeCompare(right.date.raw);
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return minutesFromSlot(left) - minutesFromSlot(right);
    })[0];
}

export function buildSlotUrl(slot, config) {
  const timeRange = `${slot.starts_at.format_24_hour}-${slot.ends_at.format_24_hour}`;
  return (
    `${config.baseWebUrl}/location/${config.venueSlug}/${config.activitySlug}/` +
    `${slot.date.raw}/by-time/slot/${timeRange}/${slot.composite_key}/${slot.location.slug}`
  );
}

export function summarizeSlot(slot, config) {
  const bookable = isBookableNow(slot) ? "BOOK" : slot.action_to_show?.status ?? "NONE";
  const preferred = preferredCourtRank(slot, config);

  return {
    date: slot.date.raw,
    start: slot.starts_at.format_24_hour,
    end: slot.ends_at.format_24_hour,
    court: slot.location.name,
    courtSlug: slot.location.slug,
    price: slot.price.formatted,
    spaces: slot.spaces,
    status: bookable,
    reason: slot.action_to_show?.reason ?? "",
    firstBookable: slot.first_bookable_at?.local ?? "",
    preferredRank: preferred === Number.MAX_SAFE_INTEGER ? "-" : preferred + 1
  };
}
