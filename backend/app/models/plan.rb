class Plan < ApplicationRecord
  INTERVALS = %w[month year].freeze

  has_many :subscriptions, dependent: :restrict_with_exception

  validates :name, presence: true
  validates :code, presence: true, uniqueness: true
  validates :interval, inclusion: { in: INTERVALS }
  validates :price, numericality: { greater_than_or_equal_to: 0 }

  scope :active, -> { where(is_active: true) }
end
