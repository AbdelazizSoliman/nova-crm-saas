class InvoiceItem < ApplicationRecord
  belongs_to :invoice
end
class InvoiceItem < ApplicationRecord
  belongs_to :invoice

  before_save :compute_line_total

  private

  def compute_line_total
    self.line_total = quantity.to_i * unit_price.to_d
  end
end
