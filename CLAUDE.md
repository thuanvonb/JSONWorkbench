# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server
npm run typecheck  # tsc -b --noEmit (project references)
npm run build      # tsc -b && vite build  -> outputs to docs/
npm run preview    # serve the built docs/ output
```

There is no test runner, linter, or formatter configured. `npm run typecheck` is the only automated check — `strict`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` are on, so it catches a lot.

The build writes to `docs/` (not `dist/`) with `base: './'`, so the committed `docs/` folder is servable directly by GitHub Pages ("Deploy from a branch" → `/docs`). `docs/` is *not* gitignored — a build changes committed artifacts.

## Architecture

Browser-only React 19 + TypeScript + Vite app. No backend, no router, no state library, no runtime dependencies beyond React. Everything the user pastes stays in their tab and in `localStorage`.

### The data model (`src/types/workbench.ts`)

A three-level hierarchy that the whole app hangs off:

```
Workspace  — one pasted JSON payload: raw text + parsed rows[]
  └─ TableView[]  ("tables") — columns + filters + sort over those same rows
       └─ Column — kind 'path' (dot/bracket path) or kind 'js' (expression)
```

Multiple tables can view the same records with different columns/filters. `Row` is `unknown` — JSON allows anything, so every consumer must tolerate non-objects.

Ids from `createId()` are unique across workspaces *and* views, which is why the single `rename` action in the reducer can target either.

### State flow

`useWorkbench` (`src/state/useWorkbench.ts`) is the single owner of document state: it holds the reducer, derives the active `workspace`/`view` (falling back to the first entry so a stale id can never blank the app), and debounce-mirrors everything to `localStorage` (400 ms).

`workbenchReducer` (`src/state/workbenchReducer.ts`) is the only place document state mutates. Two helpers, `patchActive` and `patchView`, do the immutable spread down to the active workspace / active view — new actions should go through them rather than hand-rolling the nesting.

`App.tsx` owns the *ephemeral* UI state that is deliberately not persisted and not in the reducer: search text, modal open flags, parse error, inspector selection, popover state, rename draft. It wires everything together and is the only component that calls `dispatch`; child components take callbacks.

Persistence lives in `src/lib/storage.ts` under key `json-workbench.v1`. `migrateWorkspace` there upgrades pre-tables saves (which kept `columns`/`filters`/`sort` at the workspace top level), and `normalizeFilter` in `src/lib/filters.ts` upgrades pre-panel filter rows (which were tagged `kind: 'col' | 'js'` and had no on/off flag) — keep both working when the shape changes again. Saved profiles carry the same filter shape, so `src/lib/profiles.ts` has its own normalizer for them.

### The render pipeline

`selectRows(workspace, view, search)` in `src/lib/rows.ts` is the hot path: filters → global search → sort, producing `RowRef[]` (`{ row, i }` — `i` is the index in the *unfiltered* list, so the inspector and the `#` column always refer to the original record). `App` then slices to `display.maxRows` for rendering; the status bar reports both counts.

`cellValue(col, row, i)` (`src/lib/cell.ts`) resolves a cell either by path or by evaluating the column's expression, and `formatCell` turns any value into `{ text, variant }` — the CSS owns the look, not the formatter.

### User-supplied JavaScript

`src/lib/expression.ts` compiles `js` columns and `custom` filter rows with `new Function('row', 'i', ...)`, cached by source string. This is intentional: it's the product feature, and the code only ever touches data the user pasted into their own browser. Two behaviours to preserve:

- If the expression evaluates to a function (so `row => row.total` works as well as `row.total`), the result is applied to `(row, i)`.
- Compile and runtime errors are folded into a `CellError` (`{ __err }`) sentinel that flows through the value pipeline and renders as `⚠ message`, rather than throwing.

Related convention in `src/lib/filters.ts`: a filter that *cannot* be evaluated (unknown column, bad regex) returns `true` and keeps the row — a half-typed filter must never silently hide data. For the same reason a filter row is only applied once its `enabled` flag is switched on in the Filter tab, and new rows start off. `compound` rows (two rows joined by a boolean connective) are stored and edited but not evaluated yet; `isApplied` is the single place that decides what narrows the table.

### Styling

CSS Modules per component (`Foo.tsx` + `Foo.module.css`), plus three globals imported by `src/styles/global.css`:

- `tokens.css` — every colour as a semantic `--var` in oklch. Components must not hardcode colours; add a token instead.
- `controls.css` — shared button primitives, prefixed `wb-` to stay distinct from module class names.

Class names are composed with `cx()` from `src/lib/cx.ts`.

### `mockup/`

`mockup/JSON Workbench.dc.html` is the original static design mockup the implementation was ported from (the tokens in `tokens.css` were lifted from it). It's a reference artifact, not built or imported — leave it alone unless the design itself is changing.

## Conventions

- Pure logic goes in `src/lib/*` as standalone functions taking plain data; components stay presentational and receive callbacks. Follow this when adding features — e.g. label strings live in `lib/labels.ts`, popover positioning math in `lib/popover.ts`.
- `verbatimModuleSyntax` is on: type-only imports must use `import type`.
- Overlays (modals, popovers) use `useEscapeKey` and the `stopPropagation`/`isolate` helpers in `lib/events.ts` to keep clicks off the closing scrim.
