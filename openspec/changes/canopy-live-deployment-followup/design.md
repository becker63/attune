# Design

This follow-up will model Canopy deployment as ManagedRecipe lifecycle work:

```text
Canopy resource declaration
  -> ManagedRecipe plan
  -> human-reviewed apply
  -> readiness check
  -> rollback/destroy
  -> receipt and drift repair
```

The design must keep provider mutation behind explicit review gates and use
Nx targets only as recipe projections.
