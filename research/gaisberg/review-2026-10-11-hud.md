# Review 2026-10-11: HUD readable from the saddle

Chris: "get rid of the big schild with gradient.. its annoying to see it all the time.. also i have the laptop 2m away,
so the small numbers are not readable, make sure those get bigger and group them correctly.. also show VAM".
Shots: `scripts/hud-shots.mjs` (climb, workout, segment, lead-in, ready) at 1728x1117 CSS px, 2x, with "-2m"
copies shrunk to what 20/20 vision resolves at 2 m. Reviewer: serpentine-reviewer (Haiku). Reports verbatim.

## Round 1: REJECT

**Findings**

1. **Readability at 2 m:** Readable: the main watts (260, 114, 320, 202), target W, VAM (230, 910), gradient % (1 %, 7 %), km to the top, hm to go, altitude, and the bottom totals values. Weak: the small labels (W/kg, rpm, bpm, Gear, "Slope 100 %", and the bottom labels time, km ridden, km/h, hm climbed) are small and grey and blur. "then 12:00 at 195 W" is mush. BEFORE was far worse: the bottom labels, the "6.8 km and 563 hm" line and the sign text were unreadable. The improvement is large.
2. **Grouping:** Effort and climb groups are logical, and each label sits under its number. Problem: "Slope 100 %" (trainer slope) sits in small text in the effort panel, so the rider sees two gradients and 100 % can read as a grade. The bottom totals split across the screen (four left, two right) and read as one row only by proximity.
3. **Sign, VAM, gradient:** VAM is shown. Gradient is shown with a coloured underline. The sign is gone in the climb, segment, lead-in and ready shots. It is still present in workout mode (see blockers).
4. **Coverage and contrast:** The top panels take roughly a fifth of each top corner and the scene stays visible. Over the bright facade in after-leadin-2m the right panel turns grey and the "Easy lead-in" line weakens. No clipping in the climb shots. In the workout shot the segment box stacks under the effort panel and adds clutter.
5. **Workout case:** The coach message reads well at 2 m. The "114 W 9:43" line and the interval bar read. "then 12:00 at 195 W" is faint. The pacer rows (3.2 W/kg +21 m, 3.6 W/kg +26 m) read well but have only moderate contrast against the trees.

Scope: segment, lead-in and ready were judged from their -2m images only.

**Blockers**

- The triangular gradient sign is still shown at top centre in workout mode (after-workout-1x and after-workout-2m, showing 7 %). This fails the request to remove the sign.

**Top 3 improvements**

1. Remove the triangle sign in workout mode as well.
2. Move "Slope 100 %" out of the effort panel or label it "trainer slope", so the only grade on screen is the climb gradient.
3. Enlarge the small labels (W/kg, rpm, bpm, Gear, bottom labels, "then ... at 195 W") and make the panels a little more opaque over bright sky.

**Verdict: REJECT.** The gradient sign still appears in workout mode, which the rider explicitly asked to remove; otherwise readability and grouping are a clear improvement.

Builder's note: the after-workout shot had no sign (the component was deleted); the reviewer had opened the before shot,
which it confirmed in round 2. Fixed in response: "Difficulty" label, larger and brighter labels, more opaque panels,
notes inside the climb panel, pacers on a panel.

## Round 2: APPROVE

**Correction:** My earlier blocker was wrong. I had read before-workout-1x.png, not after-workout-1x.png. The re-captured after-workout-1x.png shows only the coach message at top centre, with no triangle sign. The sign is gone in every mode.

**Findings**

1. **Readability at 2 m:** Much better. The main watts, target W, VAM, gradient %, km to the top, hm to go, altitude and the bottom values all read. Labels (W/kg, rpm, bpm, Gear, Difficulty, the bottom labels) are now legible. Still faint: "9.4 km to go" in the segment box and the ERG badge. Keyboard hints are out of scope.
2. **Grouping:** Effort, climb and pacer panels are clear. "Difficulty 100 %" is separate from the climb gradient, so the rider can no longer read it as a grade. The bottom totals split (time, km, speed, hm left; normalized power and kJ right). I think that is acceptable: the left row is ride progress and the right pair is power and energy, with aligned baselines.
3. **Sign, VAM, gradient:** The sign is gone in all modes. VAM is shown (240, 750, 910, 1240). Gradient is shown with a colour underline (1 % green, 4 % yellow, 7–8 % orange).
4. **Coverage and contrast:** Panels are more opaque, and text stays readable over the bright facade in after-leadin-2m. Each top panel covers about a fifth of the width, and the scene stays visible. No overlaps or clipping.
5. **Workout case:** The coach message, the 114 W / 9:43 line, the larger "then 12:00 at 195 W" line and the pacer panel all read at 2 m. The pacer panel is now separate and clear.

Scope: I re-read after-workout (1x and 2m), after-climb (1x and 2m), after-segment-2m, after-leadin-2m and after-ready-2m. I did not re-open after-segment-1x, after-leadin-1x or after-ready-1x.

**Blockers:** None.

**Top 3 improvements**

1. Make the "9.4 km to go" line in the segment box larger and brighter, since it is the only remaining faint text.
2. Consider a small label or a shared baseline for the bottom row, so the left and right halves read as one ride-totals group.
3. Enlarge the ERG badge in workout mode.

**Verdict: APPROVE.** The sign is gone, VAM is shown, and the values and labels are readable at 2 m with clear grouping; the remaining points are minor polish.

Builder's note: improvements 1 and 3 applied after approval (segment "to go" 22 → 27, ERG badge 24 → 30 at design size).
