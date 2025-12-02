class ActivityLog < ApplicationRecord
  belongs_to :account
  belongs_to :user, optional: true

  validates :action, presence: true
  validates :metadata, presence: true
end
