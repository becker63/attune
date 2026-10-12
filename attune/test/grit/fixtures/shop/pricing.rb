# frozen_string_literal: true

module Shop
  module Pricing
    # Keep prices in integer cents. Empty baskets total zero.
    def self.total_cents(items)
      items.sum do |item|
        item.fetch(:quantity) * item.fetch(:unit_price_cents)
      end
    end
  end
end
