class Subscription < ApplicationRecord
  STATUSES = %w[trialing active past_due canceled incomplete].freeze

  belongs_to :account
  belongs_to :plan

  validates :status, inclusion: { in: STATUSES }

  scope :current, -> { where(status: %w[trialing active past_due]) }

  def active?
    return false if status == "canceled"
    return false if current_period_end.present? && current_period_end < Time.current

    true
  end

  def in_trial?
    status == "trialing" && trial_ends_at.present? && trial_ends_at.future?
  end

  def days_left
    return nil unless current_period_end

    [(current_period_end.to_date - Time.current.to_date).to_i, 0].max
  end
end
