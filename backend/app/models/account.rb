class Account < ApplicationRecord
  VALID_CURRENCIES = %w[USD EUR GBP SAR EGP].freeze

  has_many :users, dependent: :destroy
  has_many :clients, dependent: :destroy
  has_many :invoices, dependent: :destroy
  has_many :payments, through: :invoices

  validates :default_currency, inclusion: { in: VALID_CURRENCIES }
  validates :invoice_prefix, presence: true
  validates :default_tax_rate, numericality: { greater_than_or_equal_to: 0 }
  validates :default_payment_terms_days, numericality: { greater_than: 0, only_integer: true }
end
