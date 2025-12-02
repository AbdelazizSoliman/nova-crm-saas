class Product < ApplicationRecord
  PRODUCT_TYPES = %w[product service].freeze

  belongs_to :account

  scope :active, -> { where(is_active: true) }

  before_validation :set_default_currency

  validates :name, presence: true
  validates :unit_price, numericality: { greater_than_or_equal_to: 0 }
  validates :default_tax_rate, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :sku, uniqueness: { scope: :account_id }, allow_blank: true
  validates :product_type, inclusion: { in: PRODUCT_TYPES }, allow_blank: true

  private

  def set_default_currency
    self.currency ||= account&.default_currency
  end
end
