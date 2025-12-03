class InvoiceItem < ApplicationRecord
  belongs_to :invoice

  before_save :compute_line_total

  private

  def compute_line_total
    self.line_total = quantity.to_d * unit_price.to_d
  end
end
