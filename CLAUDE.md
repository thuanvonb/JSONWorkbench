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
  └─ TableView[]  ("tables") — offset + columns + filters + sort + grain over those same rows
       └─ Column — kind 'path' (dot/bracket path) or kind 'js' (expression)
```

Multiple tables can view the same records with different columns/filters, and a table's `offset` can point it at a *part* of them. `Row` is `unknown` — JSON allows anything, so every consumer must tolerate non-objects.

Ids from `createId()` are unique across workspaces *and* views, which is why the single `rename` action in the reducer can target either.

### State flow

`useWorkbench` (`src/state/useWorkbench.ts`) is the single owner of document state: it holds the reducer, derives the active `workspace`/`view` (falling back to the first entry so a stale id can never blank the app), and debounce-mirrors everything to `localStorage` (400 ms).

`workbenchReducer` (`src/state/workbenchReducer.ts`) is the only place document state mutates. Two helpers, `patchActive` and `patchView`, do the immutable spread down to the active workspace / active view — new actions should go through them rather than hand-rolling the nesting.

`App.tsx` owns the *ephemeral* UI state that is deliberately not persisted and not in the reducer: search text, modal open flags, parse error, inspector selection, which panel tab is open (and which one the Panel button reopens on), the panel's dragged width, the schema tree's open branches, popover state, rename draft, the pending offset the confirm is asking about. Those shapes live in `src/types/ui.ts`. `App` wires everything together and is the only component that calls `dispatch`; child components take callbacks.

Persistence lives in `src/lib/storage.ts` under key `json-workbench.v1`. `migrateWorkspace` there upgrades pre-tables saves (which kept `columns`/`filters`/`sort` at the workspace top level), and `normalizeFilters` in `src/lib/filters.ts` upgrades filter rows saved before the filter panel (tagged `kind: 'col' | 'js'`, no on/off flag) re-points compound operands that were stored as row positions rather than ids, and maps renamed connectives (`THEREFORE` → `IMPLIES`) through `normalizeBoolOp`, which also floors an unreadable connective at `AND` rather than letting it reach the evaluator — keep all of that working when the shape changes again. Saved profiles carry the same rows, so `src/lib/profiles.ts` has its own normalizer; a profile stores compound operands *by position* on purpose, since it mints fresh ids on load. `migrateView` and the profile loader both default a missing `grain` to `[]`, a missing `keepEmpty` to `true` and a missing `offset` to `''`, so anything saved before arrays could be expanded still opens as one row per record, and anything saved before tables could be re-rooted still opens on the whole source — the grain and the offset are pure paths, which is why a profile can carry them verbatim while everything else in a profile has to be re-pointed by name.

### The render pipeline

`resolveOffset(rows, offset)` (`src/lib/offset.ts`) comes first and decides *which records* the table reads; `expandRows(records, view)` (`src/lib/grain.ts`) turns those into the table's rows — one per record, or one per array entry once the view has a grain — and `selectRows(rows, view, search)` in `src/lib/rows.ts` is the hot path over them: filters → global search → sort. `App` holds all three, so `records` (not `workspace.rows`) is what every consumer below sees, `expanded.length` is the row total the status bar reports against, and then slices to `display.maxRows` for rendering.

A `RowRef` is one table row, not one record: `i` is still the index in the *unfiltered* record list, so the inspector always resolves the original record, while `scopes`/`idx`/`abs` say where inside it the row sits and `key` identifies the row itself (`"2:1.0"`). Selections are keyed by `key`, since one record can now hold several rows.

`cellValue(col, ref)` (`src/lib/cell.ts`) resolves a cell either by path — from the grain level the path sits under — or by evaluating the column's expression, and `formatCell` turns any value into `{ text, variant }` — the CSS owns the look, not the formatter. `toSearchText` and `safeStringify` live in `src/lib/text.ts` rather than next to `formatCell`, so `grain.ts` can flatten join results without importing `cell.ts` back.

### Table offset (`src/lib/offset.ts`)

A view's `offset` re-roots one table at a nested path: `'orders.lines'` makes the table read one record per line rather than one per order. `resolveOffset` walks the path and *flattens* every array it crosses — including one at the end, which is the case that turns a nested list into records — and reports `spansArray` so the last crumb can read `lines[]`. It returns the original array untouched when there is no offset, so the no-offset path costs nothing.

The offset is upstream of everything: `records` replaces `workspace.rows` for the grain, the schema tree, path collection, inferred columns, the inspector and the aggregates alike. Only two things still read the source — the offset bar's "N source records →" tally, and `shapeKey` for profiles, which has to describe the payload, not the slice.

Because columns, filters, grain and sort all resolve against the old root, `offset/set` in the reducer drops them with the change; that is why `App` puts the `OffsetConfirm` in front of it whenever there is a setup to lose, with "Open in a new table" (`offset/newTable`) as the way to keep both. An offset only *starts* in the schema tree's ⤓ button, since that is where the user is looking at the nested key — and because the tree describes the records the table already reads, its paths are relative, which is what `childOffset` resolves.

### Row grain (`src/lib/grain.ts`)

A view's `grain` is the list of arrays it expands into rows — `[{path:'orders'},{path:'lines'}]` means one row per `orders[].lines[]` entry, each level's path stored *relative* to the one above. `expandRows` walks it into a `RowRef` per combination of entries; `keepEmpty` decides whether a record whose array is empty still gets one row with blank cells below that level. Nothing else in the app needs to know a grain exists: filters, search, sort, CSV and the aggregates all take a `RowRef`.

Everything hangs off two pure functions:

- `scopeForPath(path, absolutePaths)` — the deepest grain level a column path sits under, and what is left of the path below it. That is why `orders.lines.sku` reads as `sku` against the line the row came from, with no rewriting of the column itself: dropping the grain makes the same column resolve from the record again.
- `resolveValue(base, rest, config)` — reads that remainder, resolving any array it *still* crosses per the column's `arrayMode` (`first`, `index`, `join`, `count`). An explicit `[2]` in the path always wins over the mode, and a path ending *on* an array is handled separately from one crossing it.

`arrayMode: 'expand'` is the odd one out — it is not a way of resolving an array, it is a request to put that array on the grain, so it never reaches `resolveValue`. `effectiveArrayMode` is where that reconciles: a column already inside an expanded level reads as `expand` whatever it stored, and a column still crossing an array reads a stored `expand` as `first`. Picking a mode in the popover therefore applies *at once* rather than on Apply (`patchColumnArray` in `App`), because expanding an array changes every row on screen, not one column.

`columnGrains(rows, view)` runs that per column for the header badges, and gives `DataTable` the level it needs to dim cells that merely repeat the row above (`isRepeatedCell`). Where a column meets an array is *sampled* from the first 40 records, so it is a description of the data, never a constraint on it.

### User-supplied JavaScript

`src/lib/expression.ts` compiles `js` columns and `custom` filter rows with `new Function('row', 'i', 'item', ...)`, cached by source string. `row` is always the whole record and `item` the array entry the row was expanded from — the same thing when the view has no grain. This is intentional: it's the product feature, and the code only ever touches data the user pasted into their own browser. Two behaviours to preserve:

- If the expression evaluates to a function (so `row => row.total` works as well as `row.total`), the result is applied to `(row, i, item)`.
- Compile and runtime errors are folded into a `CellError` (`{ __err }`) sentinel that flows through the value pipeline and renders as `⚠ message`, rather than throwing.

Related convention in `src/lib/filters.ts`: a filter that *cannot* be evaluated (unknown column, bad regex) returns `true` and keeps the row — a half-typed filter must never silently hide data.

### Filter rows are a graph (`src/lib/filterTree.ts`)

A view's `filters` is a flat list, but a `compound` row references two other rows *by id*, so the rows form a graph rather than a list that can be folded. `buildFilterPlan(filters)` resolves it once per filter change and is the only place that decides what narrows the table:

- **roots** — the trees that run, ANDed together. A row is a root when it is `enabled` and nothing folded it in.
- **consumed** — row id → the compound that folded it in. An enabled compound *consumes* its operands: they become sub-expressions and stop applying on their own (their own `enabled` flag is then irrelevant), which is the only reading under which `OR`, `XOR` and `NOR` do anything. The panel dims them and disables their flag.
- **issues** — a row that cannot be resolved: a reference `cycle` (detected by the DFS stack while building, and flagged on every row in the cycle), an `unset-operand`, a `missing-operand` (the row was deleted), or a `broken-operand` (propagated). Such a row is left out of the plan entirely, so a half-built compound neither hides nor reveals rows, and it does not consume its operands either — they keep their own flags.

`evaluateNode` walks one tree per row and short-circuits where the connective allows (`IMPLIES` is material implication, `!a || b`, and `NOT IMPLIES` its negation, `a && !b`); `describePlan` renders the plan as `(#1 OR #2) AND #4` for the panel footer. New rows start off, for the same reason above.

A new connective has to be added in four places: the `BoolOp` union in `types/workbench.ts`, `BOOL_OPS` in `lib/filters.ts` (which is what the panel's dropdown lists), `combine` in `filterTree.ts`, and `settleOnLeft` there — the latter is where a connective declares whether the left operand alone can decide it, so omitting it only costs the short-circuit, never correctness.

There is no test runner, so the tree logic was verified with a throwaway esbuild+node harness rather than a committed test file — worth rebuilding if the semantics change. The offset resolution and the grid-navigation maths were checked the same way.

### The bars above the table

`OffsetBar` says which part of the source this table reads (`reading from source ▸ orders ▸ lines[]`) and walks the offset back; its crumbs come from `offsetCrumbs`, and every one of them goes through the same confirm as the schema tree. It only appears once a table is re-rooted.

`GrainBar` sits under it and says what one row is (`1 row per record ▸ items[]`). It only appears once something is expanded — a grain *starts* in the column popover, since that is where the user is looking at the array. Its chips walk the grain back (`grain/trim`), `nextGrainKey` offers the next array below the deepest level, and the keep-empty toggle is the same flag the expansion reads. Both live inside `App`'s grid column above the scroller, so they stay put while the table scrolls.

### The right-hand panel

`SidePanel` is a shell: a tab strip (`record` / `schema` / `columns` / `filter`, the `PanelTab` union), a resize grip, and whichever tab body `App` passes as children. It holds no tab state — `App` decides which one is showing, so closing and reopening the panel comes back to the same tab.

Its width is the same deal: `App` holds it and `SidePanel` renders it, so a dragged width survives the panel being closed. `usePanelResize` (`src/hooks/usePanelResize.ts`) owns only the drag — it listens on `document` while the pointer is down (the pointer leaves the 7px grip immediately) and sets `body.wb-resizing` for the page-wide cursor and selection lock defined in `controls.css`. The bounds are pure and live in `src/lib/panelSize.ts`: `clampPanelWidth` keeps a floor for the panel *and* a floor for the remaining grid, with the panel's floor winning on a narrow window. Double-clicking the grip resets to `DEFAULT_PANEL_WIDTH`.

### Inferred schema (`src/lib/schema.ts`)

`buildSchema(rows)` walks the records into a tree of `SchemaContainer` / `SchemaKey`, counting for every key how often it appeared and which types it held; a key present on fewer records than its container was observed is *optional*, more than one type makes it *mixed*. Objects inside an array fold into the same child shape, so `items[].id` is described once rather than per element.

`flattenSchema` turns that tree into the rows the panel renders, honouring the open-branch map and the optional-only toggle; `expandablePaths` feeds expand-all. Each row's add button puts the path on the table as a `path` column via `createPathColumn` (`lib/factories.ts`, also what `inferColumns` maps over), and `columnedPaths(columns)` is what tells the tree which keys are already shown so the button reads as spent. Keys that hold records — a branch, an array or an object — carry a second ⤓ button that offsets the table to them instead.

### Keyboard navigation

`useGridKeys` (`src/hooks/useGridKeys.ts`) listens on `document` because nothing in the table holds focus: arrow keys walk the cell selection, Escape clears the selection and then closes the panel. It ignores modified arrows and anything typed into an input, and `App` disables it outright while an overlay is open, so each modal keeps its own `useEscapeKey`. The movement itself is pure — `cursorFor`/`moveCursor` in `src/lib/gridNav.ts`, where a row (rather than cell) selection has no column to walk along and a row that filtering took away falls back to the top.

Scrolling the selection into view is `useCellIntoView`, which finds the cell by the `data-cell` attribute `DataTable` writes (`cellDomKey`) rather than by a ref, and `scrollDeltas` in `src/lib/scroll.ts` for the numbers — the padding there is what clears the sticky header row and index column.

### Styling

CSS Modules per component (`Foo.tsx` + `Foo.module.css`), plus two globals imported by `src/styles/global.css`:

- `tokens.css` — every colour as a semantic `--var` in oklch. Components must not hardcode colours; add a token instead.
- `controls.css` — shared button primitives, prefixed `wb-` to stay distinct from module class names.

Class names are composed with `cx()` from `src/lib/cx.ts`.

### `mockup/`

`mockup/JSON Workbench.dc.html` is the original static design mockup the implementation was ported from (the tokens in `tokens.css` were lifted from it). It's a reference artifact, not built or imported — leave it alone unless the design itself is changing.

## Conventions

- Pure logic goes in `src/lib/*` as standalone functions taking plain data; components stay presentational and receive callbacks. Follow this when adding features — e.g. label strings live in `lib/labels.ts`, popover positioning math in `lib/popover.ts`, panel width bounds in `lib/panelSize.ts`.
- `src/hooks/*` is for the leftover browser behaviour that cannot be pure — document-level listeners and their cleanup (`useEscapeKey`, `usePanelResize`, `useGridKeys`, `useCellIntoView`). The numbers such a hook works with still belong in `lib/`.
- `verbatimModuleSyntax` is on: type-only imports must use `import type`.
- Overlays (modals, popovers) use `useEscapeKey` and the `stopPropagation`/`isolate` helpers in `lib/events.ts` to keep clicks off the closing scrim.
