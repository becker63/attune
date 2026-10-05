# frozen_string_literal: true

# `Shop` and `Shop.Legacy` are reopened, and so is `Legacy.total_cents`: the
# same class-level method is declared twice in this one file. Attune records the
# reopenings and refuses to resolve the call to it.
module Shop
  module Legacy
    def self.total_cents(items)
      items.sum
    end
  end
end

module Shop
  module Legacy
    def self.total_cents(items)
      items.sum * 2
    end

    def self.quote(items)
      Legacy.total_cents(items)
    end
  end
end
