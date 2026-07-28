/** The complete public model: one Toolkit, one registry, and one service. */
export { AttuneToolkit, ATTUNE_OPERATIONS } from "./tools/registry.js";
export type {
  AttuneOperationError,
  AttuneOperationInput,
  AttuneOperationName,
  AttuneOperationReceipt,
  AttuneOperationResult,
  AttuneOperationWireInput,
  AttuneOperationWriter,
} from "./tools/registry.js";
export {
  InvestigationService,
  makeInvestigationService,
} from "./investigation/service.js";
export type { InvestigationServiceApi } from "./investigation/service.js";
export type {
  ActiveInvestigation,
  FinalizedInvestigation,
  MaterializedInvestigationCapability,
} from "./investigation/capability.js";
export { InvestigationLifecycleError } from "./investigation/errors.js";
export { AttuneToolFailure } from "./contract/schemas.js";
