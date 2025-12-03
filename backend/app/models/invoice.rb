class Invoice < ApplicationRecord
  belongs_to :account
  belongs_to :client
  has_many :invoice_items, dependent: :destroy
  has_many :payments, dependent: :destroy

  STATUSES = %w[draft sent paid overdue cancelled].freeze

  validates :status, inclusion: { in: STATUSES }
  validates :currency, inclusion: { in: Account::VALID_CURRENCIES }
  validates :tax_rate, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 50 }
  validates :tax_name, length: { maximum: 50 }, allow_blank: true

  accepts_nested_attributes_for :invoice_items, allow_destroy: true
  accepts_nested_attributes_for :payments, allow_destroy: true

  before_validation :ensure_number
  before_validation :apply_defaults

  def recalculate_totals!
    invoice_items.each do |item|
      item.line_total = item.quantity.to_d * item.unit_price.to_d
      item.save! if item.changed?
    end

    self.subtotal  = invoice_items.sum { |item| item.line_total.to_d }
    self.tax_total = subtotal.to_d * (tax_rate.to_d / 100.0)
    self.total     = subtotal.to_d + tax_total.to_d

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

  def apply_defaults
    self.currency ||= account&.default_currency || "USD"
    self.tax_rate = account&.tax_rate if tax_rate.nil?
    self.tax_name ||= account&.tax_name || "VAT"
  end
end
