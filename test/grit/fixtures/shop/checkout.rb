# frozen_string_literal: true

require_relative "pricing"

module Shop
  module Checkout
    def self.free_shipping?(items:, threshold_cents: 5_000)
      Pricing.total_cents(items) >= threshold_cents
    end
  end
end
