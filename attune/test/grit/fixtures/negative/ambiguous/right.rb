# frozen_string_literal: true

module Shop
  module Cart
    module Pricing
      def self.total_cents(items)
        items.sum { |item| item.fetch(:line_price_cents) }
      end
    end
  end
end
