# frozen_string_literal: true

# Every receiver here is a local variable, so neither call names a repository
# symbol and Attune records both as explicitly unresolved.
module Shop
  module Cart
    def self.total_cents(items)
      items.sum { |item| item.fetch(:unit_price_cents) }
    end
  end
end
