# shadcn Base Date Time Picker Design

## Goal

Replace the Untitled UI/React Aria date-time picker across the frontend with a shadcn Base UI composition whose Apply and Cancel controls remain reachable and clickable at every supported viewport size.

## Scope

The shared picker remains in the three existing workflows:

- Create violation
- Edit violation
- Mark a fine as paid

Backend, database, shared API types, React Hook Form field names, normalized form values, and Bangkok ISO payloads do not change.

## Root Cause

The existing portaled picker can exceed the available viewport height. Its content has no height constraint or scroll region, so the time and action sections can render below the visible viewport. Component tests run without real viewport layout and did not catch this failure.

## Architecture

Build the picker from the official shadcn Base UI composition:

- `Popover` wrappers over `@base-ui/react/popover`
- `Calendar` wrapper over `react-day-picker`
- Existing Lucide icons and application button styles

Keep `DateTimePickerField` as the public controlled component. Its props remain `name`, `value`, `onChange`, `onBlur`, `minValue`, `maxValue`, `error`, and `disabled`, plus the forwarded input ref. Existing form integrations therefore require no behavior or API changes.

The component owns a masked display value and a draft date/time. Opening copies the committed value into the draft. Calendar and time edits only change the draft. `นำไปใช้` validates and commits the normalized Gregorian `YYYY-MM-DDTHH:mm` value. `ยกเลิก`, outside interaction, or `Escape` discards the draft and restores focus to the main input.

## Date and Time Behavior

- Display and manual entry remain `DD/MM/BBBB HH:mm` with Buddhist year and Latin digits.
- Time remains 24-hour with minute values `00–59`.
- `react-day-picker` uses the Thai locale for weekday and month names. Custom formatters add 543 to the displayed Gregorian year.
- The calendar stores plain Gregorian dates and converts them through the existing timezone-independent helpers.
- Future values remain blocked everywhere.
- Payment time remains bounded by the exact violation timestamp, rounded up to the next selectable minute when seconds or milliseconds exist.
- Editing only the note preserves the original timestamp including seconds and milliseconds.

## Layout and Accessibility

The Base UI popover uses collision-aware positioning. Its popup height is capped to the available viewport. The calendar section scrolls when needed; time controls and action buttons remain visible at the bottom. The dialog keeps an accessible label, keyboard navigation, disabled dates, `Escape` handling, focus return, and error association on the main input.

The custom modal continues ignoring keyboard events from the portaled popover. The first `Escape` closes the picker; the next closes the modal.

## Removal

- Remove `react-aria-components` and `@internationalized/date`.
- Add `@base-ui/react` and `react-day-picker`; keep the existing `date-fns` dependency.
- Remove Untitled UI source comments, MIT attribution, and superseded Untitled UI design/plan documents so no active repository file claims that implementation remains.

## Testing

- Preserve helper coverage for Buddhist/Gregorian conversion, strict parsing, leap years, ranges, and Bangkok timezone under `TZ=UTC`.
- Replace React Aria-specific component tests with user-visible shadcn behavior tests.
- Add a regression test proving `นำไปใช้` commits the draft and closes the popover.
- Test Cancel, outside interaction, `Escape`, focus return, min/max dates, time input, manual mask, errors, and ARIA labels.
- Keep integration coverage for all three workflows, ISO payloads, payment lower bound, and exact edit timestamp preservation.
- Verify in a real browser at the viewport size that exposed the bug, then run frontend tests, full workspace tests, typecheck, lint, and production build.

## Non-Goals

- No backend or database changes.
- No redesign of surrounding modals or forms.
- No native `datetime-local` field in application-owned UI.
