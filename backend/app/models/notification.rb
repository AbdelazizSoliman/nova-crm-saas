class Notification < ApplicationRecord
  belongs_to :account
  belongs_to :user
  belongs_to :notifiable, polymorphic: true, optional: true

  scope :unread, -> { where(read: false) }
  scope :recent_first, -> { order(created_at: :desc) }

  validates :title, presence: true
  validates :action, presence: true
end
