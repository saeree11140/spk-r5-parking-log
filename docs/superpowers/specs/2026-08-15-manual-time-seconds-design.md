# Manual Time Input with Seconds Design

## Goal

Change the shared date-time field's time control to the shadcn-style native `Input` shown by the user: manual `HH:mm:ss` entry with `type="time"`, `step="1"`, and the WebKit calendar-picker indicator hidden.

## Component Design

- Add a small shared `Input` primitive under `components/ui/input.tsx` and use it in `DateTimePickerField`.
- Render the time control with `type="time"`, `step="1"`, and a dedicated class that applies `appearance: none` and hides `::-webkit-calendar-picker-indicator`.
- Keep the accessible name `เวลา <field label>`, React Hook Form `name`, forwarded ref, disabled state, blur callback, and controlled value.
- The date calendar behavior does not change.

## Value and Validation Design

- Canonical frontend form values become `YYYY-MM-DDTHH:mm:ss`.
- The picker accepts existing minute-only values and displays them as `HH:mm:00` for compatibility.
- `toDateTimeLocalValue` includes seconds. `localDateTimeToIso`, future checks, and min/max checks accept and compare seconds.
- `toDateTimeLocalCeilingValue` rounds a timestamp with milliseconds up to the next whole second, so a payment can never precede a violation with sub-second precision.
- Empty, malformed, or out-of-range manual time entry continues emitting an empty form value and blocks submission.
- API payloads remain ISO Gregorian timestamps in Asia/Bangkok conversion. Backend contracts do not change.
- Editing only the note still sends the original API timestamp unchanged, preserving its milliseconds.

## Display and Scope

- Date buttons remain `DD/MM/BBBB` using Buddhist years.
- Tables continue displaying time to minutes; only editable time controls show seconds.
- Apply to create violation, edit violation, and mark fine paid through the existing shared component.
- Remove obsolete combined date-time mask helpers and their tests because no production component uses them.

## Tests

- Date helpers: minute-value compatibility, second conversion, future/range comparisons at one-second boundaries, and sub-second ceiling.
- Picker: `type="time"`, `step="1"`, `HH:mm:ss`, hidden picker class, immediate second-level emissions, empty/invalid input.
- Integrations: all three modal payloads include selected seconds; payment lower bound and note-only timestamp preservation remain covered.
- Run frontend tests, full workspace tests, backend E2E, typecheck, lint, production build, and a browser smoke test confirming manual time entry and no visible time dropdown indicator.
