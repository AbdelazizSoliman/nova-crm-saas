class Invoice < ApplicationRecord
  belongs_to :account
  belongs_to :client
  has_many :invoice_items, dependent: :destroy
  has_many :payments, dependent: :destroy

  STATUSES = %w[draft sent paid overdue cancelled].freeze

  validates :status, inclusion: { in: STATUSES }

  accepts_nested_attributes_for :invoice_items, allow_destroy: true
  accepts_nested_attributes_for :payments, allow_destroy: true

  before_validation :ensure_number

  def recalculate_totals!
    self.subtotal  = invoice_items.sum(:line_total)
    self.tax_total = invoice_items.sum("line_total * (tax_rate / 100.0)")
    self.total     = subtotal + tax_total

    paid_amount = payments.sum(:amount)
    if paid_amount >= total
      self.status = "paid"
    elsif paid_amount.positive?
      self.status = "sent"
    end

    save!
  end

  private

  def ensure_number
    return if number.present?

    year = issue_date&.year || Date.current.year
    prefix = "INV-#{year}-"

    last_number = account.invoices
                         .where("number LIKE ?", "#{prefix}%")
                         .order(:number)
                         .pluck(:number)
                         .last

    next_seq =
      if last_number.present?
        last_number.split("-").last.to_i + 1
      else
        1
      end

    self.number = "#{prefix}#{format('%04d', next_seq)}"
  end
end
