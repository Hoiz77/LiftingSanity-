# Tests

The tests open the app in a phone-sized Chromium browser, use it the way you would (taps, typing, swipes, locking
the screen, going offline) and check what happens. They run against the files in this folder, through a small web
server they start themselves. Nothing is installed on your phone and nothing here is sent anywhere.

## Run them

```sh
npm install                      # Playwright, the browser driver (once)
npx playwright install chromium  # the browser itself (once)
npm test                         # everything, about 6 minutes
npm run test:quick               # without the two slow ones, about 3 minutes
node tests/run.js logging        # just one file (any start of a file name works)
STEPS=500 node tests/stress.test.js   # a longer random-tapping run
```

Each check prints ✓ or ✗ with a plain description, and the run ends with a summary. A file fails if any check fails
or the page throws an error.

## What's covered

| File | What it checks |
| --- | --- |
| `welcome` | A new phone opens with the welcome: kg or lb, a ready-made plan (without anyone else's starting weights), building your own, sample workouts, skipping; it never comes back; someone who already has data never sees it. |
| `arabic` | Switching to العربية turns the app right to left; every screen (tabs, workout, menus, number pad, rest timer, summary, details, plan review, the welcome) is scanned for English that isn't meant to be there; switching back to English. |
| `selfcheck` | The app's own self-check of its calculation rules: working sets, left/right pairs, warm-ups, 1RM limits, kg ↔ lb, backup validation. |
| `logging` | One tap logs what's shown; a set that can't be checked changes nothing; suggestions follow the set type (warm-up, back-off, drop, second side, "120s" targets); the number pad never types into the wrong set; the RIR picker; one-row left/right; supersets (rest at the end of a round, moving on, unlinking); replacing an exercise; the finish prompt. |
| `records-and-plans` | Records stay right when history changes (past workouts, deletes, the same exercise twice, resets during a workout); weekly volume across clock changes; chart labels; early saves; splits keep "up next" when days are removed or moved; blocks; Enter on Cancel; custom exercises. |
| `data-safety` | Odd saves are mended on opening; unreadable data is never written over; a deleted template can't leave a dead day; backups hold everything (photos too); damaged backups change nothing; restores set the old data aside; two tabs at once. |
| `backups` | The last-backup line in Settings, the reminder on the Train page (and "Later"), the daily copies kept on the device, going back to one, and Erase removing them. |
| `lifecycle` | Locking the phone or swiping the app away saves what you just typed; a full device is reported; the rest timer keeps time across a locked screen. |
| `redraw` | The workout screen redraws only what changed (that's what keeps it smooth); after 19 kinds of change, it must match drawing everything again. |
| `transitions` | The workout growing out of / shrinking into its bar, tab crossfades and the moving highlight, sheets sliding and pull-to-close, the card following a finger; fast repeated taps; Reduce Motion. |
| `offline` | The installed app opens and logs sets with no signal; a new version waits until you tap Reload, keeps your open workout and clears the old files. |
| `scores` | Growth scores are shown as estimates with their points and caveats, and aren't given to stretches, timed holds or carries; band exercises are scored for being light in the stretch. |
| `layout` | At 375, 393 and 430 px wide in both styles, across every tab, a workout, sheets and the summary: nothing cut off, no sideways scrolling, short button labels centred. Uses the real fonts when online. |
| `stress` | Random taps and odd typed values in six set-ups, checking after every step for page errors, NaN/undefined on screen, broken or duplicated data and unreadable saves. |

## What they can't cover

They run in Chromium, not Safari. Real-iPhone behaviour (Safari's own quirks, haptics, how smooth animations feel,
the Home Screen app being suspended) still needs a try on the phone.
