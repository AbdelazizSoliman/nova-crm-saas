class Account < ApplicationRecord
  VALID_CURRENCIES = %w[USD EUR GBP SAR EGP].freeze
  INVOICE_TEMPLATES = %w[template_a template_b template_c classic default].freeze

  has_one_attached :invoice_logo

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
  validates :invoice_template, inclusion: { in: INVOICE_TEMPLATES }
  validates :brand_color, format: { with: /\A#?(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})\z/ }, allow_nil: true

  before_validation :normalize_brand_color, :normalize_invoice_template

  def current_subscription
    subscriptions.current.order(created_at: :desc).first
  end

  def current_plan
    current_subscription&.plan
  end

  def invoice_template_key
    normalized = invoice_template.presence || "template_a"
    normalized == "default" ? "template_a" : normalized
  end

  def invoice_brand_color
    normalized = brand_color.presence || "#2563eb"
    normalized.start_with?("#") ? normalized : "##{normalized}"
  end

  def invoice_branding
    {
      template: invoice_template_key,
      brand_color: invoice_brand_color,
      footer_text: footer_text,
      additional_note: additional_note,
      logo: invoice_logo
    }
  end

  private

  def normalize_brand_color
    return unless brand_color.present?

    color = brand_color.strip
    color = "##{color}" unless color.start_with?("#")
    self.brand_color = color.downcase
  end

  def normalize_invoice_template
    self.invoice_template = invoice_template_key if invoice_template_changed?
  end
end
