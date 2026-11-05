# Dashboard: Design

## Routes

| route | component | notes |
|---|---|---|
| `/` | Redirects to `/calls` | |
| `/calls` | `CallListPage` | Cassette card list |
| `/calls/[id]` | `CallDetailPage` | Full card and transcript |
| `/settings` | `SettingsPage` | Notification email, retention info |
| `/login` | `LoginPage` | Supabase Auth magic link |

All routes under `/calls` and `/settings` are protected by a middleware check. Unauthenticated requests redirect to `/login` with the original URL as a `next` parameter.

## Component tree

```
RootLayout
  AuthProvider (Supabase session context)
  TapeDeckShell (nav, top bar)
    CallListPage
      UrgentCallsBanner (only when high-urgency unhandled calls exist)
      CassetteGrid
        CassetteCard (x N)
          UrgencyIndicator
          ExpiryWarning (conditional)
          HandleButton
      EmptyState (conditional)
      LoadMoreButton

    CallDetailPage
      CassetteHeader (caller name, time, urgency, language)
      MessageCardPanel
        FieldRow: callerName
        FieldRow: callbackNumber
        FieldRow: reason
        FieldRow: urgency
        SuggestedReplyBox (copyable textarea)
      TranscriptPanel (full text, scrollable)
      HandleButton
      ExpiryWarning (conditional)

    SettingsPage
      NotificationEmailForm
      RetentionPolicyDisplay
```

## Data access

All data fetching uses React Server Components where the data is needed only on load. Client components are used only where interactivity is required (HandleButton, SuggestedReplyBox copy action, NotificationEmailForm).

Server components fetch from Supabase directly using the server-side client. Row-level security ensures each owner sees only their own data, so no owner ID filter is needed in query code (the policy enforces it).

### Key queries

**Call list:**
```sql
SELECT c.id, c.received_at, c.status, c.is_silent_or_empty, c.transcript_language,
       m.caller_name, m.callback_number, m.urgency, m.handled_at, m.expires_at
FROM calls c
JOIN message_cards m ON m.call_id = c.id
WHERE c.received_at > now() - interval '30 days'
  AND m.expires_at > now()
ORDER BY
  CASE WHEN m.urgency = 'high' AND m.handled_at IS NULL THEN 0 ELSE 1 END,
  c.received_at DESC
LIMIT 20
```

**Call detail:**
```sql
SELECT c.*, m.*
FROM calls c
JOIN message_cards m ON m.call_id = c.id
WHERE c.id = $1
```

## State management

Local UI state (detail panel open, optimistic handled toggle) is managed with React state in client components. No global state library is used. Server state is managed by revalidating the relevant route after mutations.

The HandleButton sends a PATCH to `/api/calls/[id]/handle` and uses `useOptimistic` to update the UI before the response arrives. On failure it reverts.

## Visual design: cassette card

Each CassetteCard renders as a rectangle with:
- A cassette label area (caller name, reason truncated to one line)
- Two reel circles (decorative, aria-hidden)
- A bottom strip with: time received, urgency badge, handled indicator
- High-urgency unhandled: red left border using the accent colour
- Handled: reduced opacity on the label area

The card is a single `<article>` with a wrapping `<a>` to the detail route. The HandleButton is inside the article but outside the link to avoid nested interactive elements (it uses `event.stopPropagation()`).

## Empty state

The empty state renders inside `CassetteGrid` when the query returns zero rows. It shows:

> "No messages yet. Calls will appear here as cassette cards when someone leaves a message."

Below that, a link: "Check your notification email in Settings" which navigates to `/settings`.

The empty state has no illustration. It uses the same monospace type as other labels.

## Settings: notification email form

The form is a controlled client component. Flow:
1. Show current email (partially redacted)
2. Owner enters new email, clicks Save
3. Client validates email format
4. POST to `/api/settings/email` with new address
5. API sends confirmation email, returns 202
6. UI shows: "Check your inbox at [new address] to confirm."
7. On confirmation link click (separate route `/api/settings/email/confirm?token=...`): activate new address, redirect to `/settings`

Until confirmed, the old address remains active. The pending address is stored in the `owners` table as `pending_notification_email` with an expiring token.

## Settings: retention policy display

A static panel (no form) showing:

- "Audio recordings: deleted immediately after transcription"
- "Message cards and transcripts: kept for 30 days"
- "You can delete individual calls at any time from the call detail view."

No editable fields. No save button.

## Error states

| situation | UI response |
|---|---|
| Call list fails to load | Error message with a retry button |
| Call detail not found | "This call does not exist or has expired." with a back link |
| Handle action fails | Toast notification: "Could not update. Please try again.", UI reverts |
| Settings save fails | Inline form error below the email field |
| Session expired mid-session | Redirect to login, preserve current URL as `next` param |

## Accessibility notes

- The cassette card grid uses `role="list"` and `role="listitem"` to give screen readers the list structure, since the cassette styling uses `<article>` elements that do not imply list semantics
- `UrgencyIndicator` for high urgency renders both the visual red border and a visually hidden `<span>Urgent</span>` for screen readers
- `SuggestedReplyBox` has a visible label "Suggested reply" and a copy button labelled "Copy to clipboard"
- Focus moves to the first field in the detail view when it opens, and returns to the originating card when it closes
- All transitions respect `prefers-reduced-motion` by using a CSS media query to set `transition: none` and `animation: none`
