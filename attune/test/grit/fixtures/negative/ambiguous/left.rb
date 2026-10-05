# frozen_string_literal: true

module Shop
  module Pricing
    def self.total_cents(items)
      items.sum { |item| item.fetch(:quantity) * item.fetch(:unit_price_cents) }
    end
  end
end
