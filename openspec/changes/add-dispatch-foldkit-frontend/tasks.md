## 1. OpenSpec

- [x] 1.1 Inspect FoldKit and editorial/mockup imports.
- [x] 1.2 Clone and inspect `becker63/v0-web-page-mockup` under `imports/github/v0-web-page-mockup`.
- [x] 1.3 Create `add-dispatch-foldkit-frontend`.
- [x] 1.4 Add Dispatch FoldKit app requirements.
- [x] 1.5 Add FoldKit MDX data-shape requirements.
- [x] 1.6 Add v0 React page-grammar migration requirements.
- [x] 1.7 Add feed projection requirements.

## 2. Linear

- [x] 2.1 Create Linear issues for the Dispatch frontend lanes.
- [x] 2.2 Add estimates and sequencing for a fast one-week build.
- [x] 2.3 Add a Linear project document summarizing this OpenSpec change.

## 3. Nx Packages

- [x] 3.1 Add `dispatch-schema`.
- [x] 3.2 Add `dispatch-core`.
- [x] 3.3 Add `dispatch-feed`.
- [x] 3.4 Add `dispatch-foldkit`.
- [x] 3.5 Add `dispatch-web`.
- [x] 3.6 Add workspace path aliases and project targets.

## 4. Dispatch Domain

- [x] 4.1 Implement `DispatchItem`, `WorkThread`, `DispatchDigest`, and route schemas.
- [x] 4.2 Implement `DispatchMdxPage` and `DispatchMdxDocument` schemas.
- [x] 4.3 Implement the constrained FoldKit MDX component registry.
- [x] 4.4 Implement thread/digest derivation from items.
- [x] 4.5 Implement feed renderers.
- [x] 4.6 Add fixture history from the current rollout.

## 5. FoldKit App

- [x] 5.1 Implement FoldKit `entry`, `model`, `message`, `update`, `view`, and route modules.
- [x] 5.2 Render the event river as the first screen.
- [x] 5.3 Render human-action, safety, thread, digest, and feed-link states.
- [x] 5.4 Render FoldKit MDX documents through FoldKit nodes.
- [x] 5.5 Keep the app mobile-first and small-phone readable.

## 6. Validation

- [x] 6.1 Run `dispatch-schema` typecheck.
- [x] 6.2 Run `dispatch-core` typecheck.
- [x] 6.3 Run `dispatch-feed` typecheck.
- [x] 6.4 Run `dispatch-foldkit` typecheck.
- [x] 6.5 Add React-to-FoldKit migration Story/Scene tests for migrated routes and MDX primitives.
- [x] 6.6 Run `nx run dispatch-foldkit:test`.
- [x] 6.7 Run `dispatch-web` build.
- [x] 6.8 Start `nx run dispatch-web:serve` and provide the local URL.
