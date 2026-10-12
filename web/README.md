# Attune website

Source for [atlas-live-five.vercel.app](https://atlas-live-five.vercel.app/).
This workspace is separate from the Flix implementation in `../attune/`.

From this directory:

```sh
nix run           # preview at http://127.0.0.1:4173
nix run .#test    # check the packaged site against its recorded hashes
nix run .#deploy  # check, then publish to the existing Vercel project
```

From the repository root, use `nix run ./web` or `nix run ./web#test`.
Deployment needs `VERCEL_TOKEN` in the publisher's environment. It uses the
existing `atlas-live` project and pinned Vercel CLI; credentials never enter
Bazel actions. Use one Bazel invocation at a time, including the Flix workspace.

```text
site/         the complete browser site: pages, scripts, graphics, and frozen data
authoring/    retained chapter text and teaching examples
deploy/       the existing Vercel publisher
BUILD.bazel   package, check, preview, and deploy
release.json  SHA-256 of every shipped asset
```

`site/` is the deployed source of truth. Packaging copies it unchanged; it does
not regenerate studies or make model calls. `authoring/` preserves the earlier
MDX chapters and Flix examples, not an automatic rebuild of the current site.
The overview fragment is also retained in `authoring/overview.html`.

The overview owns the five-waits plots. Runtime explains acquisition, replay,
and shared work. Their historical measurements keep their original populations
and timing boundaries. Current implementation links point to the Flix workspace;
historical teaching snippets retain their study context.

When changing a page, update its entry in `release.json` and the digest of the
sorted `files` map (compact JSON, SHA-256). `//:layout_test` checks the complete
packaged inventory. Nix supplies the tools; Bazel packages and tests the site.
