# Split Date and Time Picker Design

## Goal

Replace the combined date-time text field and Apply/Cancel popover with the shadcn Base UI layout: a date trigger beside a native time input. Apply this shared component to create violation, edit violation, and mark fine paid forms.

## Interaction

- Render one field label above a horizontal date/time control group.
- The date control is an outline button displaying `DD/MM/BBBB`, where `BBBB` is the Buddhist year.
- Clicking the date control opens the existing Base UI popover and `react-day-picker` calendar.
- Selecting an enabled date commits it immediately, closes the popover, and restores focus to the date trigger.
- The time control is a native `input[type="time"]` using 24-hour `HH:mm` precision.
- Changing either control immediately emits the combined internal value `YYYY-MM-DDTHH:mm`.
- No Apply or Cancel actions remain in the popover.

## Validation and Data Flow

- Keep the existing controlled `DateTimePickerField` interface so all React Hook Form integrations remain unchanged.
- Preserve Gregorian internal values, Buddhist display years, Asia/Bangkok API conversion, and unchanged edit timestamps when the user only edits the note.
- Preserve `minValue` and `maxValue` rules. Future values remain invalid everywhere; payment time cannot precede the violation time.
- Disable calendar dates outside the allowed date range. Since a boundary day may still contain invalid times, validate the combined value after every date or time change and expose the existing Thai range error.
- An empty or invalid control emits an empty form value so schema validation blocks submission.

## Accessibility and Layout

- Associate the shared label with the date trigger and provide distinct accessible names for date and time controls.
- Keep keyboard navigation, Escape dismissal, outside-click dismissal, and modal/popup Escape isolation.
- Fit both controls inside existing modal widths; stack them on narrow screens if needed.
- Continue using the current Base UI Popover and shared Calendar primitives. Do not add another date-picker dependency.

## Tests

- Component tests cover Buddhist date display, immediate calendar commit/close, native time change, min/max validation, keyboard dismissal, focus restoration, and accessible labels.
- Existing create, edit, and payment modal integration tests continue verifying form values and API payloads.
- Run focused frontend tests, workspace tests, typecheck, lint, and production build.

## Out of Scope

- Backend, database, shared API types, and table date formatting do not change.
- Manual typing of a combined `DD/MM/BBBB HH:mm` string is removed in favor of separate date and time controls.
