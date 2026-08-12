# JSON Workbench

A browser-only tool for turning JSON into tables you can shape: pick columns by
path or by JavaScript expression, filter, sort, search, inspect raw values and
export CSV. Everything runs client-side and persists to `localStorage` — no
server, no upload.

Built from the design mockup in [`mockup/`](mockup/).

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then emit the static site into docs/
npm run preview    # serve the built docs/ folder
```

## Deploying to GitHub Pages

The production build is written to `docs/` and uses relative asset URLs
(`base: './'` in [`vite.config.ts`](vite.config.ts)), so it works from any
repository subpath.

1. Commit `docs/` (it is intentionally **not** git-ignored).
2. In the repository, open **Settings → Pages**.
3. Set **Source** to *Deploy from a branch*, pick your branch and the
   **/docs** folder, then save.

Re-run `npm run build` and commit `docs/` again to publish changes.
`docs/.nojekyll` (copied from `public/`) keeps Pages from running Jekyll over
the output.

## Concepts

- **Workspace** — one set of parsed records plus its source text. Tabs along the
  top; each is stored separately.
- **Table** — one arrangement of columns, filters and sort over a workspace's
  records. Tabs along the bottom, so several tables can read the same data.
- **Column** — either a *path* (`customer.address.city`, `items[0].sku`) or a
  *JavaScript* expression evaluated per record with `row` and `i` in scope.
- **Filter** — a column/operator/value rule, or a JavaScript predicate.

Paste an array of objects, a single object, an object wrapping a record array
(`{ "data": [...] }`), or NDJSON. Columns are inferred from the shape of the
first records on parse.

JavaScript columns and filters are compiled with `new Function` and run in the
page against data you pasted yourself. Nothing leaves the tab, but treat
expressions from untrusted sources the same way you would treat any script.

## Layout

```
src/
  main.tsx                 React entry point
  App.tsx                  Composition root: UI state + wiring
  types/
    workbench.ts           Domain model (Workspace, TableView, Column, Filter…)
    ui.ts                  Transient UI shapes (drafts, popover, rename)
  state/
    workbenchReducer.ts    Every mutation of the persisted document
    useWorkbench.ts        Reducer + localStorage mirroring + derived selection
  lib/                     Pure, framework-free logic
    parse.ts               JSON / NDJSON / wrapped-array parsing
    path.ts                Path reads, type labels, column inference
    expression.ts          Compiled user expressions (cached) + error wrapping
    cell.ts                Value resolution and display formatting
    filters.ts             Operators, predicate evaluation, pill labels
    rows.ts                Filter + search + sort pipeline, aggregates
    csv.ts, download.ts    Export
    storage.ts             Persistence and schema migration
    factories.ts, id.ts    Entity constructors
    inspect.ts, labels.ts  Presentation strings
    popover.ts, cx.ts      Small UI helpers
    demoData.ts            Sample records
  components/              One component + one CSS module each
  hooks/useEscapeKey.ts
  styles/
    tokens.css             Colour, type and elevation tokens
    controls.css           Shared button/input/segmented primitives
    global.css             Reset, fonts, scrollbars
```

`lib/` has no React imports, so the data pipeline can be exercised on its own.
Components hold no domain logic: they render props and raise callbacks.

## Keyboard and mouse

| Action | How |
| --- | --- |
| Rename a workspace or table | double-click its tab (or `F2`) |
| Sort a column | click the header name — asc, desc, off |
| Edit or remove a column | `⋯` in the header |
| Inspect a value | click a cell |
| Inspect a whole record | click the row number |
| Close an overlay | `Esc`, or click outside |
| Display density, zebra rows, row cap | **Organize** |
