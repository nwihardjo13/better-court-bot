# Better Court Bot

Playwright project for Better court booking.

First version keeps risk low:

- `probe`: read Better public API, show matching slots and release times
- `login`: open persistent browser session so you can log in once manually
- `prepare`: open best matching slot page, stop before clicking
- `basket`: click `Add to basket` for best matching slot
- `watch`: poll until a matching slot becomes bookable, then open slot page

## Current Highbury finding

Live Better slot data for `highbury-tennis` currently shows `first_bookable_at` at `22:00` Europe/London for future slots, not midnight.

## Setup

```bash
cd /home/nathan/src/better-court-bot
npm install
npx playwright install chromium
cp .env.example .env
```

## Verify it works

First verify Chromium can launch. This does not open Better or use your login:

```bash
npm run browser-check
```

Success prints `Chromium ... launched successfully.`

Then validate configuration, Better API access, slot parsing, and release-time detection. This does not open a browser or change a booking:

```bash
npm run probe
```

Working output has all of these:

- `Activity` names Highbury Tennis and lists courts.
- `Matching Slots` table contains courts within your date and time criteria.
- `Best Candidate` either shows a bookable court or says `No bookable slot right now.`

`No bookable slot right now.` is normal when matching courts are full or have not been released. It still proves the API and filtering work.

Then test browser setup and Better login without selecting a court:

```bash
npm run login
```

A Chromium window opens. Log into Better and close the browser when your account page loads. Next `npm run login` should retain the session; if it asks again, login persistence failed.

When `probe` shows a bookable candidate, test navigation only:

```bash
npm run prepare
```

It should print selected court, open its Better slot page, and stop before adding it to basket. Do not use `basket` as first test because it changes Better basket.

## Commands

Try add-to-basket for best matching slot:

```bash
npm run basket
```

Watch and jump when slot becomes bookable:

```bash
npm run watch
```

## Notes

- Browser session is reused from `PROFILE_DIR`, so saved Better login should persist.
- Saved card may still trigger 3DS, CVV, or bank approval later. This version stops before payment.
- If you change target courts or time window, edit `.env`.
- `.env`, browser profile, and Vim swap files are ignored by Git and must never be committed.
