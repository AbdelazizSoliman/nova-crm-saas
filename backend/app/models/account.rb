class Account < ApplicationRecord
  VALID_CURRENCIES = %w[USD EUR GBP SAR EGP].freeze

  has_many :users, dependent: :destroy
  has_many :clients, dependent: :destroy
  has_many :products, dependent: :destroy
  has_many :invoices, dependent: :destroy
  has_many :payments, through: :invoices
  has_many :activity_logs, dependent: :destroy
  has_many :subscriptions, dependent: :destroy
  has_many :plans, through: :subscriptions

  alias_attribute :tax_rate, :default_tax_rate

  validates :default_currency, inclusion: { in: VALID_CURRENCIES }
  validates :invoice_prefix, presence: true
  validates :default_tax_rate, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 50 }
  validates :tax_name, length: { maximum: 50 }, allow_blank: true
  validates :tax_inclusive, inclusion: { in: [true, false] }
  validates :default_payment_terms_days, numericality: { greater_than: 0, only_integer: true }

  def current_subscription
    subscriptions.current.order(created_at: :desc).first
  end

  def current_plan
    current_subscription&.plan
  end
end
