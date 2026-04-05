---
name: mouse-effect
description: Ensures clickable UI elements use pointer cursor and disabled UI uses disabled cursor states.
user-invocable: true
---

# Mouse Effect Skill

Use this skill whenever the task is about hover/cursor behavior on interactive UI elements.

## Goal

- Clickable/actionable elements should show `cursor-pointer`.
- Disabled elements should show a disabled cursor state such as `cursor-not-allowed`.

## Rules

1. For interactive controls (`button`, clickable links, action chips/cards), apply `cursor-pointer`.
2. For disabled controls, use disabled cursor styling (`disabled:cursor-not-allowed` in Tailwind).
3. Avoid contradictory states (for example, don't keep pointer cursor on disabled controls).
4. Prefer setting these defaults in shared UI primitives so behavior is consistent across the app.

## Tailwind Example

```tsx
className="cursor-pointer disabled:cursor-not-allowed"
```

## Quick Check

- Hover a clickable element (e.g. "Download emoji") -> pointer cursor.
- Set it to disabled -> not-allowed cursor.
