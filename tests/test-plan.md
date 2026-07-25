# v0.1 browser test plan

Run against both the local server and the production GitHub Pages URL.

## Core learner journey

1. Open the site with no existing local storage.
2. Confirm the welcome page is usable without technical instructions.
3. Enter a display name and reach Home.
4. Select each energy option and each duration preference.
5. Confirm no more than three recommendations appear.
6. Open the first quest, start it, reveal one hint, and pause it.
7. Return to the quest, mark it stuck, and save attempts, an error, and a tutor
   question.
8. Confirm the content appears safely in Tutor Corner.
9. Resume the quest and complete it with time, confidence, and evidence.
10. Confirm XP, completion feedback, an unlocked quest, and garden growth.
11. Refresh and close/reopen the browser; confirm progress remains.

## State and data

- Locked quests cannot be started or recommended.
- Completing the same quest cannot award XP twice.
- Only one quest is active at a time.
- Paused and stuck quests remain available after reload.
- Returning from stuck records the clover reward and awards the one-time bonus.
- Reset requires the explicit confirmation checkbox.
- Invalid stored JSON falls back to a usable fresh state with a warning.
- Unavailable `localStorage` leaves the app usable in temporary mode.

## Accessibility and layout

- Complete the core journey with a keyboard.
- Confirm every input has a visible label and every focus indicator is visible.
- Check 200% browser zoom.
- Check widths of approximately 360, 768, and 1366 pixels.
- Confirm there is no horizontal page scrolling at 360 pixels.
- Confirm reduced-motion operating-system settings and the in-app toggle work.
- Confirm status is conveyed with text, not only colour.

## Browsers

- Current Chrome
- Current Firefox
- Current Edge
- Mobile Chrome or mobile Safari against the production URL
