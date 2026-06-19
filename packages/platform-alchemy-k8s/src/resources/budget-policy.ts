import { Schema } from "effect"

export const BudgetClass = Schema.Literals(["free", "standard", "expensive"])
export type BudgetClass = typeof BudgetClass.Type

export interface BudgetPolicyRequired {
  readonly budgetClass: BudgetClass
  readonly reservationRequired: true
}

export const BudgetPolicy = {
  required: (budgetClass: BudgetClass = "standard"): BudgetPolicyRequired => ({
    budgetClass,
    reservationRequired: true,
  }),
  labels: (policy: BudgetPolicyRequired): Readonly<Record<string, string>> => ({
    "attune.dev/budget-class": policy.budgetClass,
    "attune.dev/budget-reservation-required": String(policy.reservationRequired),
  }),
} as const
