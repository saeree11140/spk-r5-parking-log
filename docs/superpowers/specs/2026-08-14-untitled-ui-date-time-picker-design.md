# Untitled UI Date Time Picker Design

## Goal

Replace all native `datetime-local` controls with one accessible date-time picker adapted from Untitled UI while preserving the existing Bangkok-time form and API contracts.

## Product behavior

- Apply the picker to create violation, edit violation, and mark fine paid.
- Display and accept `DD/MM/BBBB HH:mm`, where `BBBB` is the Buddhist year and digits are `0-9`.
- Use a 24-hour clock with arbitrary hours `00-23` and minutes `00-59`.
- Keep form values as Gregorian `YYYY-MM-DDTHH:mm` Bangkok wall time and API values as ISO instants.
- Reject incomplete, impossible, future, or out-of-range values.
- Prevent payment timestamps before the related violation.
- Preserve the original API timestamp, including seconds and milliseconds, when an edit changes only the note.

## Component design

Create a controlled `DateTimePickerField` using React Aria Components and `@internationalized/date`. The component owns a masked display string and popover draft, while React Hook Form owns the normalized form value.

The input accepts digits, inserts `/`, a space, and `:` automatically, and exposes the actual form `name` and forwarded ref. A complete valid value is converted from Buddhist to Gregorian and emitted. Empty, incomplete, or invalid input emits an empty form value so schema validation blocks submission instead of silently retaining an older value.

The calendar popover follows Untitled UI's date-time picker composition: trigger/input, calendar navigation, today shortcut, time controls, and cancel/apply actions. Calendar and time changes remain draft state until apply. Cancel, outside interaction, or Escape discards the draft and restores focus to the input.

Use locale `th-TH-u-ca-buddhist-nu-latn` so calendar headings and dates use Thai Buddhist calendar with Latin digits. Use existing application color, spacing, button, and icon primitives rather than importing Untitled UI's full theme.

## Boundaries and validation

`DateTimePickerField` accepts optional normalized `minValue` and `maxValue`. Calendar dates outside the range are disabled; apply is disabled if the complete date-time is outside the precise range. Manual values use the same range check. Existing Zod schemas remain the final validation layer.

Create and edit use the render-time Bangkok current minute as `maxValue`. Payment uses the violation timestamp as `minValue` and the current minute as `maxValue`.

The React Aria popover portals outside the custom modal. The modal keyboard handler must ignore key events whose target is outside its panel so Escape closes the nested popover first and the popover's focus scope controls Tab navigation.

## Compatibility and attribution

No backend, database, or shared API contract changes. Existing date-time conversion remains host-timezone independent. The adapted component retains an Untitled UI source attribution and the repository includes its MIT notice.

## Verification

Cover Buddhist/Gregorian conversion, masks, strict date/time parsing, leap years, range checks, picker draft behavior, keyboard/focus behavior, all three form integrations, ISO payloads, and timestamp preservation. Run tests under `TZ=UTC`, workspace typechecks, lint, and production build.
