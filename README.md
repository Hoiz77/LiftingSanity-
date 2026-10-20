# Lifting Sanity

A lifting log for iPad and iPhone. Log every set, follow a split, rest between sets and watch your lifts go up. It opens full screen from your Home Screen and works without signal at the gym.

**Open it:** https://hoiz77.github.io/LiftingSanity-/ (after GitHub Pages is turned on, see below)

## What it does

- **Workouts that flow.** One exercise at a time with big Previous / Next buttons, swipe left or right to move, or switch to a single list. The exercise rail on the left shows how many sets are done on each.
- **Your Full Body EOD split, built in.** All 17 exercises from your Lyfta session, in order, with your warm-ups, working sets, left/right order and last weights. Train one day, rest the next: rest days pass with the calendar, and you can still train any day you like.
- **Fast set logging.** Each row shows what you did last time. Tap the check and it logs those numbers, or type new ones. Weight, reps and RIR (or RPE) for every set.
- **Sets aren't fixed.** **Add set** and **−** add or remove sets on the spot, **Repeat last** adds another copy of the set you just did, and swiping a set to the left shows **Delete** (with Undo). Did 80 kg on the set before? The blue **↓ 80 × 6** button on the next set copies it in one tap.
- **Set types.** Working, warm-up, top set, back-off, drop set, to failure, AMRAP, rest-pause, myo-reps, cluster, partials and negatives. Each set number is drawn as a small plate in its type's colour (dashed yellow for warm-ups) and fills in when the set is done. Tap it to change the type. Warm-ups and partials stay out of your records.
- **One side at a time.** One-arm and one-leg sets get a left row and a right row, each with its own weight, reps, RIR and check. The rows themselves are marked: a green **L** plate and a purple **R** plate, held together in one block with a green and purple edge. The rest timer waits until both sides are done.
- **One-side warm-ups too.** Warm-up sides keep their green or purple plate, drawn dashed with a yellow **W** tag, and read "WL" / "WR" in your history. **Warm-ups** adds one more warm-up (left and right on a one-side exercise) or a one-side warm-up on any exercise. Tap a set's number to switch just that set between one side at a time and both sides together, in a workout or in a template.
- **Exercise pictures.** Every exercise shows a body map with the muscles it works in red. Add your own photo of any machine with your camera; photos are kept on the device and included in backups.
- **Rest timer.** Starts by itself when you check a set, with −15 / +15 / Skip and a sound when it's over. Each exercise remembers its own rest.
- **Supersets.** Link two exercises and it moves you back and forth, resting only after the round.
- **Splits ready to go.** Push / Pull / Legs, Upper / Lower, Full Body, Bro Split, Arnold Split, PHUL, 5×5 and Dumbbells Only. Start the next day or any day you like. Build and edit your own templates and splits.
- **1,656 exercises.** Barbell, dumbbell, cable, machine, bodyweight, kettlebell, bands, strongman, Olympic lifts, cardio and mobility, plus step-by-step **How to do it** instructions for over 1,300 of them. Add your own.
- **Progress.** Your week as a `weekly_stats.log` card you can share, estimated 1RM, heaviest weight and volume charts per exercise, best weight for every rep count, weekly volume, sets per muscle, records and a week streak. Every session is numbered.
- **Smart suggestions.** Hit the top of your rep range on every set and it suggests adding weight next time. One tap adds warm-up sets, and a plate calculator shows what to load on each side.
- **Reset progression, keep your history.** Start a new block (new program, after a break or an injury) and your records and charts start fresh. Earlier blocks stay saved and viewable, and the All time view still shows everything. You can also reset one exercise, and undo either.

## Turn on GitHub Pages (once)

1. Open https://github.com/Hoiz77/LiftingSanity-/settings/pages (this is **Settings → Pages** in the repository).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Pick the **main** branch and the **/ (root)** folder, then **Save**.
4. After a minute the site is live at https://hoiz77.github.io/LiftingSanity-/

## Put it on your iPad or iPhone

The same link works on both. The layout adapts to the screen, and on iPhone you type weights and reps on a built-in number pad with Next, + / − and Log keys, so the keyboard never covers your sets.

1. Open the link above in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open Lifting Sanity from your Home Screen.

Your workouts are saved on each device itself, not online, so the iPad and the iPhone each keep their own log. Make a backup now and then from **Settings → Back up** and keep the file in Files or iCloud Drive. **Restore** loads it on any device, which is also how you move your log from one to the other.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page and all of its styling |
| `app.js` | Everything the app does |
| `exercises.js` | The exercise library and the ready-made splits |
| `library-extra.js` | About 1,200 more exercises and the how-to steps, made from [exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) |
| `sw.js` | Keeps the app on the device so it opens offline |
| `manifest.webmanifest`, `icon-*.png` | Home Screen name and icon |

No build step and no dependencies. Edit a file, push, and the site updates.

## Credits

Exercise names, muscles, equipment and instructions in `library-extra.js` come from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (MIT License). That dataset's images and GIFs belong to Gym visual and are licensed separately, so they are not included; the app draws its own muscle maps and lets you add your own photos.
