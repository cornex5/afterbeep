# Dashboard: Requirements

## Scope

The dashboard is the owner-facing web UI. It shows all calls as cassette cards, lets the owner read transcripts and message cards, mark calls as handled, and configure their notification email. It does not cover telephony setup or the call pipeline.

## Requirements

### REQ-D01: Cassette card list

WHEN the owner opens the dashboard,
THE SYSTEM SHALL display all calls from the last 30 days as a list of cassette cards, sorted newest first.

Acceptance criteria:
- Each card shows: caller name (or "unknown"), callback number (or "unknown"), urgency level, time received, and handled status
- High-urgency calls display the red accent indicator
- Handled calls are visually distinct from unhandled calls (muted appearance, not removed from list)
- The list paginates or loads more: at most 20 cards visible at once

### REQ-D02: Empty state

WHEN the owner opens the dashboard and no calls have been received in the last 30 days,
THE SYSTEM SHALL display an empty state that explains why the list is empty and what the owner should do next.

Acceptance criteria:
- The empty state does not show a sad illustration with no context
- It includes a short explanation ("No calls yet. When someone leaves a message, it appears here.")
- It includes a link or pointer to the settings page to confirm notification email is set up

### REQ-D03: Call detail view

WHEN the owner clicks a cassette card,
THE SYSTEM SHALL display the full call detail: the complete message card fields, the full transcript text, the call timestamp, and the detected transcript language.

Acceptance criteria:
- All message card fields are shown: caller name, callback number, reason, urgency, suggested reply
- Fields that are "unknown" are shown with that label, not hidden
- The full transcript is readable, not truncated
- The detected language is shown (e.g. "Transcript: German")
- The suggested reply is displayed in a copyable text area

### REQ-D04: Mark as handled

WHEN the owner clicks the "Mark as handled" button on a call detail or cassette card,
THE SYSTEM SHALL record the handled timestamp and update the card's visual state immediately.

Acceptance criteria:
- The action is available from both the list view and the detail view
- The UI updates optimistically: the card shows as handled before the server responds
- If the server call fails, the UI reverts and shows an error message
- A handled call can be unmarked: clicking "Mark as handled" on a handled call offers "Unmark"

### REQ-D05: Urgent call prominence

WHEN the call list contains one or more high-urgency calls that are not yet handled,
THE SYSTEM SHALL display those calls at the top of the list, regardless of received time.

Acceptance criteria:
- High-urgency, unhandled calls appear before all other calls
- Within the high-urgency group, newest first
- Once a high-urgency call is marked as handled, it returns to its chronological position in the list

### REQ-D06: Transcript language display

WHEN a call was spoken in a language other than English,
THE SYSTEM SHALL display the detected language alongside the transcript so the owner knows what language to expect.

Acceptance criteria:
- A German transcript is labelled "German"
- An English transcript is labelled "English" or the label is omitted (either is acceptable, choose one and be consistent)
- The language label is visible without scrolling on the detail view

### REQ-D07: Settings: notification email

WHEN the owner navigates to the settings page,
THE SYSTEM SHALL allow them to view and update the email address where message cards are sent.

Acceptance criteria:
- The current notification email is shown (partially redacted: first two characters and domain visible, rest replaced with asterisks)
- The owner can enter a new email address and save it
- The new address is validated as a syntactically valid email before saving
- A confirmation email is sent to the new address before it becomes active
- Until confirmed, message cards continue going to the old address

### REQ-D08: Settings: data retention display

WHEN the owner navigates to the settings page,
THE SYSTEM SHALL display the current data retention policy (transcripts kept 30 days, audio deleted immediately after transcription) in plain language.

Acceptance criteria:
- The retention policy is shown as readable text, not a legal document
- The owner cannot change these values (they are fixed by the privacy policy)
- A note confirms that audio is never retained after transcription

### REQ-D09: Authentication

WHEN an unauthenticated user attempts to access any dashboard page,
THE SYSTEM SHALL redirect them to the login page.

Acceptance criteria:
- All dashboard routes are protected: direct URL access redirects to login
- Login uses Supabase Auth (email + magic link or email + password, one method chosen consistently)
- After login, the user is redirected to the page they originally requested
- Sessions expire after 7 days of inactivity

### REQ-D10: Responsive layout

WHEN the owner accesses the dashboard on a mobile device,
THE SYSTEM SHALL display a usable layout where cassette cards are readable and all primary actions are reachable without horizontal scrolling.

Acceptance criteria:
- The card list is readable at 375px viewport width
- The detail view fits without horizontal scroll at 375px
- The "Mark as handled" and copy-reply actions are reachable on mobile
- Touch targets are at least 44x44px

### REQ-D11: Accessibility

WHEN a user navigates the dashboard using a keyboard or screen reader,
THE SYSTEM SHALL provide a complete and equivalent experience.

Acceptance criteria:
- All cassette cards are keyboard focusable and activatable with Enter or Space
- The detail view can be dismissed with Escape
- Focus is managed correctly when the detail view opens and closes
- All images and decorative cassette elements have appropriate alt text or aria-hidden
- Colour alone is not used to convey urgency: high-urgency cards also have a text label

### REQ-D12: Call expiry visibility

WHEN a call record is within 7 days of its 30-day expiry,
THE SYSTEM SHALL show a visual indicator on the cassette card that the record will be deleted soon.

Acceptance criteria:
- Cards expiring within 7 days show an expiry warning (e.g. "Expires in 3 days")
- The warning is visible on both the list card and the detail view
- Expired records are not shown in the list (they have been deleted)
