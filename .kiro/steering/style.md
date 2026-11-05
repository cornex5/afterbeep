# Afterbeep: Style

## Design language: tape deck

The interface looks and feels like a vintage tape deck. Every call is a cassette. The aesthetic is warm, tactile, and nostalgic without being kitsch. Precision and clarity live inside the nostalgia.

## Colours

- Background: warm off-white (`#F5F0E8`)
- Foreground / text: dark charcoal (`#1C1C1A`)
- Accent: one red, used only for the record indicator and active/urgent states (`#C0392B`)
- No other accent colours. No gradients except subtle tape-texture overlays.

## Typography

- Labels, metadata, and system text: monospace (e.g. `JetBrains Mono` or system monospace fallback)
- Body and call transcripts: a readable serif or clean sans; warm, not sterile
- Heading scale is modest. Nothing shouts.

## Components

- Call cards look like cassette tapes: rectangular, slightly rounded, with a label area and reel details
- The cassette list is a shelf or rack, not a data table
- Status indicators use the tape metaphor: rewinding, playing, done, handled

## Motion and sound

- The only sound is a subtle tape-hiss, played on explicit user actions only (pressing play on a call, marking as handled)
- Always respect `prefers-reduced-motion`: no animations, no sound autoplay, no transitions when the user has asked for reduced motion
- Transitions are slow and mechanical when they do play, not bouncy or springy

## Copy rules

- Plain words. No marketing fluff. No exclamation marks.
- Write as if leaving a note on a desk: direct, useful, human.
- NEVER use the long dash character (em dash or en dash) anywhere in copy, UI labels, or documentation. Use commas, colons, parentheses, or new sentences instead.
- Avoid passive voice where active is clearer.
- Error messages say what happened and what the user can do next.
- Empty states give a reason and an action, not just a sad illustration.

## Accessibility

- Colour contrast meets WCAG AA minimum everywhere
- Every interactive element has a visible focus ring
- Audio controls have text labels, not icons alone
- The cassette metaphor is decorative: all information is available without understanding the visual metaphor
