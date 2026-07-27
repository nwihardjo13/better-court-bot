# Better Court Bot

Standalone Playwright project for Better court booking. No repo required. Folder is enough.

First version keeps risk low:

- `probe`: read Better public API, show matching slots and release times
- `login`: open persistent browser session so you can log in once manually
- `prepare`: open best matching slot page, stop before clicking
- `basket`: click `Add to basket` for best matching slot
- `watch`: poll until a matching slot becomes bookable, then open slot page

## Why separate folder

Playwright is normal Node project. It does not need its own Git repo. Separate folder is cleaner because it needs:

- `package.json`
- `node_modules`
- browser profile directory
- `.env` config

## Current Highbury finding

Live Better slot data for `highbury-tennis` currently shows `first_bookable_at` at `22:00` Europe/London for future slots, not midnight.

## Setup

```bash
cd /home/nathan/src/better-court-bot
npm install
npx playwright install chromium
cp .env.example .env
```

## Basic use

Probe public data first:

```bash
npm run probe
```

Open browser and log in manually:

```bash
npm run login
```

Open best matching slot page without clicking:

```bash
npm run prepare
```

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
