# frozen_string_literal: true

require_relative "pricing"

module Shop
  module Receipt
    def self.render(customer:, items:)
      cents = Pricing.total_cents(items)
      dollars, remainder = cents.divmod(100)

      format("Thanks, %s. Total: $%d.%02d", customer, dollars, remainder)
    end
  end
end
