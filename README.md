# Better Court Bot

Browser automation project for Better court booking, built with [Playwright](https://playwright.dev/docs/intro).

First version keeps risk low:

- `probe`: read Better public API, show matching slots and release times
- `login`: open persistent browser session so you can log in once manually
- `prepare`: open best matching slot page, stop before clicking
- `basket`: click `Add to basket` for best matching slot
- `watch`: poll until a matching slot becomes bookable, then open slot page
- `watch-basket`: poll until a matching slot becomes bookable, then add it to basket

## Current Highbury finding

Live Better slot data for `highbury-tennis` currently shows `first_bookable_at` at `22:00` Europe/London for future slots, not midnight.

## Setup

Clone the repository, then run every `npm` command from the cloned `better-court-bot` directory. That directory contains `package.json`.

```bash
git clone https://github.com/nwihardjo13/better-court-bot.git
cd better-court-bot
npm install
npx playwright install chromium
cp .env.example .env
```

If you already cloned it, open a terminal in its directory before running commands:

```bash
cd better-court-bot
```

`npm run browser-check` will fail with `ENOENT ... package.json` if run from parent directory instead.

## Verify it works

From the `better-court-bot` directory, first verify Chromium can launch. This does not open Better or use your login:

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

Run every command from the cloned `better-court-bot` directory.

| Command | What it does | Changes booking? |
| --- | --- | --- |
| `npm run browser-check` | Launches and closes Chromium. Checks Playwright setup. | No |
| `npm run probe` | Shows matching courts, release time, and best available candidate. | No |
| `npm run login` | Opens Better so you can log in. Keeps local browser session. | No |
| `npm run prepare` | Opens best available slot page. | No |
| `npm run basket` | Adds best available slot to Better basket now. | Yes |
| `npm run watch` | Polls until matching slot is available, then opens its slot page. | No |
| `npm run watch-basket` | Polls until matching slot is available, then adds it to Better basket. | Yes |

For one command before release, log in once first with `npm run login`, then run:

```bash
npm run watch-basket
```

It polls Better until a matching slot becomes available, opens that slot using saved browser session, and clicks `Add to basket`. It stops at basket. Payment remains manual because Better or bank may require CVV or 3DS approval.

Selection order: preferred court order, then earliest date, then earliest time. Leave `PREFERRED_COURTS=` blank to accept any court.

Use an inclusive rolling day range in `.env`:

```env
TARGET_DATES=
TARGET_DAYS_AHEAD_FROM=5
TARGET_DAYS_AHEAD_TO=7
```

This checks every date from five through seven days ahead. `TARGET_DATES` overrides range when non-empty.

## Notes

- Browser session is reused from `PROFILE_DIR`, so saved Better login should persist.
- Saved card may still trigger 3DS, CVV, or bank approval later. This version stops before payment.
- If you change target courts or time window, edit `.env`.
- `.env`, browser profile, and Vim swap files are ignored by Git and must never be committed.
