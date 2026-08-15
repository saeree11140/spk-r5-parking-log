# Cycle History Readability Design

## Goal

Increase the readability of cycle metadata, fine totals, and violation tables without changing the density or typography of tables elsewhere in the application.

## Visual Design

- Keep the cycle title at its existing size.
- Increase the opened/closed date line to `15px`.
- Increase total labels to `14px` and total values to `20px`.
- Increase cycle table headers to `14px` and body cells to `16px`.
- Add modest vertical space to the totals strip and cycle table cells so the larger text does not feel cramped.
- Preserve the existing colors, card shape, status badges, and action behavior.

## Scope and Responsive Behavior

- Add a cycle-specific table class and scope typography changes to it. Other application tables remain unchanged.
- Keep the existing horizontal scrolling behavior on narrow screens.
- Keep totals on one line with horizontal scrolling when the viewport cannot fit them.
- Backend, API, data formatting, and component behavior do not change.

## Verification

- Add a component assertion for the cycle-specific table class.
- Run the focused Cycle History test, frontend typecheck, lint, and production build.
- Visually confirm the desktop layout and narrow-screen overflow behavior if a local browser session is available.
