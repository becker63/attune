# frozen_string_literal: true

require_relative "left"
require_relative "right"

# `Pricing` is reachable as both `Shop.Cart.Pricing` and `Shop.Pricing` from
# here, so the constant path names more than one declaration and Attune refuses
# to guess which one Ruby's lexical lookup would choose.
module Shop
  module Cart
    module Quote
      def self.build(items)
        Pricing.total_cents(items)
      end
    end
  end
end
