# Tests

The tests open the app in a phone-sized Chromium browser, use it the way you would (taps, typing, swipes, locking
the screen, going offline) and check what happens. They run against the files in this folder, through a small web
server they start themselves. Nothing is installed on your phone and nothing here is sent anywhere.

## Run them

```sh
npm install                      # Playwright, the browser driver (once)
npx playwright install chromium  # the browser itself (once)
npm test                         # everything, about 10 minutes
npm run test:quick               # without the two slow ones, about 3 minutes
node tests/run.js logging        # just one file (any start of a file name works)
STEPS=500 node tests/stress.test.js   # a longer random-tapping run
npx playwright install webkit    # Safari's engine (once)
LS_BROWSER=webkit node tests/journey.test.js   # any file in WebKit, with an iPhone's user agent
```

Each check prints ✓ or ✗ with a plain description, and the run ends with a summary. A file fails if any check fails
or the page throws an error.

## What's covered

| File | What it checks |
| --- | --- |
| `arabic-options` | In Arabic, exercise names and units/gym terms start as they are; switched to Arabic, the workout, library and plan review show Arabic names, كغ, احتياط and Arabic set letters; search finds an exercise by either name; details keep the English name; scores and saved data don't change; nothing English left with both on. |
| `guide` | “Set me up” on a new phone: five questions as labelled radio choices with the focus on each question, a plan and settings that fit the answers (and the choice not to use them), for all 90 combinations of answers a plan built for the days chosen whenever one exists, and any plan with a different number of days saying so and why, Back keeping answers, the six-part tour with notes by experience, the words explained, tips that show once and turn off, Settings → Guide, a plan from the guide keeping your history, and all of it in Arabic. |
| `plans` | Every ready-made plan in both versions, at each number of days it's built for, passes the plan review's checks: nothing to fix, effort 0–3 reps short of failure, 2+ minutes' rest on big lifts, 75 minutes at most, push and pull balanced, enough sets for the main muscles, big muscles twice a week, well-rated exercises. Machine versions swap every barbell, dumbbell, pull-up and dip lift one for one, never repeat an exercise and keep every set. The list narrows by days and experience (with the choice announced and the focus kept), each plan's page shows its week, days, studies and full review, Use makes it your split, a split moves to free weights and back to exactly the same exercises, and the guide gives someone new the machine version. |
| `journey` | Someone new, start to finish: first launch, the guide sets up a plan, a whole first workout logged with the number pad and ✓, the phone locked and the app closed halfway (it comes back on the same exercise with every set), Finish and its celebration (and a card made into a picture to share), History, a backup file saved, everything erased, the file restored exactly, and still there after reopening. Runs in WebKit too. |
| `colors` | Settings → Colours: each mode edited on its own (a dark-mode pick leaves light mode alone); the groups (main, background and text, left and right, set types); a swatch shows in the preview at once and nothing changes before Save; the colour wheel and hex codes (0f0 too); light colours get dark text; the light preview darkens a colour just enough, and says so; background and text for each mode, a dark-mode background kept dark, text too faint for its cards brightened; a set type's own colour with readable text on its plate, failure following the delete colour; Cancel; ready-made looks (X Dim); saved, the app, a workout's page, Finish button and warm-up plate, light mode, the end screen and its cards follow; Y2K's own editor and colours (frame, accent, highlight), in dark and light, the Clean ones kept; all back to default; colours saved by an earlier version moved to their new places. |
| `news` | What's new: after an update a note lists what's new in it, counts as seen and goes with one tap; it doesn't come back; Settings shows it again with earlier updates; it waits while a workout is open; a first launch has none. |
| `ranks` | Lift ranks: off until turned on (Progress only offers them); your details first (a bodyweight is needed); the standards (nine ranks, an 80 kg man's bench Gold about 95 kg, Silver 80% and Bronze 60% of Gold, women's standards, heavier lifters, lower at 55); which exercises are ranked and how; Progress with your rank, Start → Now muscles and lifts; an exercise's ladder; a machine marked rough and set to read heavy; All your ranks; the rank and next-rank set on a workout card; a rank-up filling the screen, then the banner (not for a first go); the end screen's rank-up and ranks cards, as a picture; an exercise's rank card to share; rank-ups through your history; ranks in the exercise list; bodyweights kept with their day; in backups, nonsense dropped; pounds; turning off and "Not now". |
| `celebrate` | Beating a record mid-workout brings the gold banner with what it beat (+2.5 kg), confetti, the trophy count and the glowing row; warm-ups, ties and first-time exercises don't; the number pad and one-row left/right sets too. Finish opens the celebration: title and number, the cards (workout, records, exercises with pictures or their stand-ins, muscles worked, getting stronger, streak, against last time) with the right numbers, the details below, Share making the card in view a 1080 × 1350 picture (a picture that can't be fetched swapped for its stand-in), the dots, the note; History's Share; the first and tenth workouts; editing; Reduce Motion. |
| `welcome` | A new phone opens with the welcome: kg or lb, a ready-made plan (without anyone else's starting weights), building your own, sample workouts, skipping; it never comes back; someone who already has data never sees it. |
| `arabic` | Switching to العربية turns the app right to left; every screen (tabs, workout, menus, number pad, rest timer, the end screen, the colours, details, plan review, a plan's page and the version switch, the welcome) is scanned for English that isn't meant to be there; switching back to English. |
| `selfcheck` | The app's own self-check of its calculation rules: working sets, left/right pairs, warm-ups, 1RM limits, kg ↔ lb, backup validation. |
| `logging` | One tap logs what's shown; a set that can't be checked changes nothing; suggestions follow the set type (warm-up, back-off, drop, second side, "120s" targets); the number pad never types into the wrong set; the pad going weight → reps → RIR on Next, a choice there (or Next) logging the set, while Log logs straight away (warm-ups skipped, RPE, each side of a one-row set, and with the step turned off in Settings); the RIR picker with the keyboard; one-row left/right; supersets (rest at the end of a round, moving on, unlinking); replacing an exercise; the finish prompt. |
| `records-and-plans` | Records stay right when history changes (past workouts, deletes, the same exercise twice, resets during a workout); weekly volume across clock changes; chart labels; early saves; splits keep "up next" when days are removed or moved; blocks; Enter on Cancel; custom exercises. |
| `data-safety` | Odd saves are mended on opening; unreadable data is never written over; a deleted template can't leave a dead day; backups hold everything (photos too); damaged backups change nothing; restores set the old data aside; two tabs at once. |
| `backups` | The last-backup line in Settings, the reminder on the Train page (and "Later"), the daily copies kept on the device, going back to one, and Erase removing them. |
| `lifecycle` | Locking the phone or swiping the app away saves what you just typed; a full device is reported; the rest timer keeps time across a locked screen. |
| `redraw` | The workout screen redraws only what changed (that's what keeps it smooth); after 20 kinds of change, it must match drawing everything again. |
| `transitions` | The workout growing out of / shrinking into its bar, tab crossfades and the moving highlight, sheets sliding and pull-to-close, the card following a finger; fast repeated taps; Reduce Motion. |
| `offline` | The installed app opens and logs sets with no signal; a new version found as the app starts switches over by itself, one that arrives while you use it waits until you tap Reload; either way the open workout stays and the old files are cleared. |
| `review` | The plan review: topics in a fixed order, the most pressing point first, counts at the top that match, every point labelled as studies (with a link) or a rule of thumb, the key that explains those, badges on one line, exercise links that open. |
| `screen` | The iPhone Home Screen app when iOS leaves the page shorter than the screen (after the keyboard has been up, or by the status bar's height): the workout, tab bar, sheets and number pad still reach the bottom edge, and nothing moves in a browser tab, an iPad window beside another app, or once the page is full height again; in the Home Screen app the open workout is part of the page and covers the screen, the page behind can't scroll or bounce, and closing leaves it where it was; the bottom of Settings shows the version and what the screen check found. |
| `scores` | Growth scores are shown as estimates with their points and caveats, and aren't given to stretches, timed holds or carries; band exercises are scored for being light in the stretch. |
| `layout` | At 375, 393 and 430 px wide in both styles (and 393 in Arabic, with Arabic names and terms in Y2K), across every tab, a workout, sheets, the end screen and the colours: nothing cut off, no sideways scrolling, short button labels centred. Uses the real fonts when online. |
| `stress` | Random taps and odd typed values in six set-ups, checking after every step for page errors, NaN/undefined on screen, broken or duplicated data and unreadable saves. |

## On every push

GitHub Actions runs them on every push and pull request ([.github/workflows/tests.yml](../.github/workflows/tests.yml)):
every file in Chromium, and `journey` in WebKit. The results are on the repository's Actions tab, and a red ✗ next
to a commit means a check failed.

## What they can't cover

They run in Chromium and WebKit, not in Safari on an iPhone. Real-iPhone behaviour (iOS's toolbar and safe areas,
the keyboard, haptics, how smooth animations feel, the Home Screen app being suspended, saving to and opening from
Files) still needs a try on the phone.

## On a real iPhone, before a release

A Safari tab keeps its data apart from the Home Screen app, so parts 1 to 3 start from nothing without touching
the log you use.

1. **First launch (Safari tab).** Open the site. The welcome appears; choose kg, then *Set me up*, answer the five
   questions, use the plan. The bottom of Settings shows the new version.
2. **A whole workout (Safari tab).** Start it. Type a weight and reps on the number pad and press Log; tap ✓ on the
   next sets. The rest timer starts by itself. Halfway: lock the phone for a minute, unlock, then swipe Safari away
   and open the site again. The workout is back on the same exercise with every set, and the timer is right. Log
   the rest, Finish: confetti, "First workout done!" and the cards. Swipe them, tap Share and check the picture in
   the share sheet. Then History.
3. **Backup and restore (Safari tab).** Settings → Back up → Save file, into Files. Erase everything → Erase (type
   ERASE). Restore → Choose file, and pick it in Files. The workout, the plan and the settings are back; close Safari and reopen to check again.
4. **The Home Screen app (your own data).** Start a workout: it reaches the bottom edge with no black strip, and
   dragging the rest timer doesn't move the page. Type a set's reps and press Next: the RIR keys come up, and one tap
   moves the pad to the next set's weight. Put a little more weight on a set than ever before and log it: the gold
   New PR! banner drops in, with a tap pattern and (sound on) a fanfare. Leave for other apps for 10 minutes or more and come back: the
   workout and timer are as you left them. Back up → Save file here too, and check the file is in Files.
