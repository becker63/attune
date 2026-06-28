# Design

This follow-up will model FoldKit as a product projection over recipe-backed
state:

```text
Recipe receipts and health
  -> product atoms
  -> FoldKit scene/update model
  -> workbench interactions
  -> product validation receipts
```

The design must separate UI interaction state from durable discovery truth and
name responsive, accessible validation gates.
