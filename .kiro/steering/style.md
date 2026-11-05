# Afterbeep: Style

## Design language: tape deck

The interface is a late 1980s answering machine deck. Every call is a cassette. The aesthetic is warm, tactile, and mechanical without being kitsch. Precision and clarity live inside the nostalgia.

## Colours

CSS custom properties on `:root`, named exactly:

- `--putty`: `#C9C4B6` (machine body)
- `--smoke`: `#1A1C1E` (acrylic window and page text)
- `--paper`: `#EFE9DA` (cassette label paper)
- `--amber`: `#FFB11F` (LED)
- `--record`: `#D2402E` (record red, urgent states only)
- `--tape`: `#4B3527` (tape brown, reels and borders)

Do not use pure white or pure black anywhere. No gradients except a faint plastic sheen on the machine body. No purple, no blue.

## Typography

- Display: "Anybody" variable font (wide, heavy settings for big headlines; narrow for LED counter labels). Package: `@fontsource-variable/anybody`.
- Body: "Instrument Sans" variable font. Package: `@fontsource-variable/instrument-sans`.
- Utility: "JetBrains Mono" variable font for timestamps, numbers, and transport labels. Package: `@fontsource-variable/jetbrains-mono`.
- Hand lettering: "Reenie Beanie" ONLY for the reason line written on each cassette label. Package: `@fontsource/reenie-beanie`.

Import font CSS in `src/app/layout.tsx`. Do not use `next/font/google`.

Heading scale is modest. Nothing shouts.

## Signature element: message counter

A seven-segment amber LED readout built with CSS and an SVG segment component (no font) shows the number of unhandled calls. The machine blinks the counter when a new call arrives. All other elements stay quiet and flat.

## Motion

One piece of motion besides the counter blink: the two cassette reels turn while a call is open or a demo call is recording.

Always respect `prefers-reduced-motion`: stop all motion, all transitions, all animations when the user has asked for reduced motion.

Transitions are slow and mechanical when they do play. Not bouncy, not springy.

## Structure encodes information

Urgency is a colored edge on the cassette: `--record` for high, `--amber` for normal, `--tape` for low. This is never decoration. No numbered steps, no icon grids, no testimonial blocks, no three-column feature cards.

## Components

- Call cards look like cassette tapes: rectangular, slightly rounded, with a label area and reel details.
- The cassette list is a shelf or rack, not a data table.
- Status indicators use the tape metaphor: rewinding, playing, done, handled.

## Copy rules

- Plain words. No marketing fluff. No exclamation marks.
- Write as if leaving a note on a desk: direct, useful, human.
- NEVER use the long dash character (em dash or en dash) anywhere in copy, UI labels, or documentation. Use commas, colons, parentheses, or new sentences instead.
- Avoid passive voice where active is clearer.
- Error messages say what happened and what the user can do next.
- Empty states give a reason and an action, not just a sad illustration.

## Accessibility

- Colour contrast meets WCAG AA minimum everywhere.
- Every interactive element has a visible focus ring in `--amber` on dark backgrounds and `--smoke` on light backgrounds.
- Audio controls have text labels, not icons alone.
- The cassette metaphor is decorative: all information is available without understanding the visual metaphor.
- Transport buttons have text labels.
