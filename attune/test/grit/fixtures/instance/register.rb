# frozen_string_literal: true

# A bare `def` is an instance method. Its body calls the class-level
# `Pricing.total_cents` by constant path, so the call must be owned by
# `Shop.Register.total` rather than left ownerless, and it must still resolve to
# the unique singleton declaration `Shop.Pricing.total_cents`.
module Shop
  class Register
    def total(items)
      Pricing.total_cents(items)
    end
  end
end
