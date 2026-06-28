## ADDED Requirements

### Requirement: Canopy live deployment is human-reviewed ManagedRecipe work

Canopy production or live Kubernetes deployment SHALL be planned separately
from ARS.

#### Scenario: Live deployment is requested
- **WHEN** a Canopy resource is planned, applied, checked, rolled back, or
  destroyed
- **THEN** the lifecycle is expressed as ManagedRecipe plus Effect Alchemy
- **AND** human review gates are explicit before provider or Kubernetes
  mutation
- **AND** receipts record plan, apply, check, rollback, destroy, drift, and
  repair evidence.
