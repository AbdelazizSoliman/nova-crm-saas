class User < ApplicationRecord
  belongs_to :account
  has_many :activity_logs, dependent: :nullify

  has_secure_password

  validates :email, presence: true, uniqueness: { scope: :account_id }
  enum :role, { owner: "owner", staff: "staff" }

  validates :job_title, length: { maximum: 100 }, allow_blank: true
  validates :phone, length: { maximum: 30 }, allow_blank: true
  validates :avatar_url, length: { maximum: 255 }, allow_blank: true
  validates :locale, length: { maximum: 10 }, allow_blank: true
  validates :timezone, length: { maximum: 100 }, allow_blank: true

  def name
    [first_name, last_name].compact.join(" ").strip
  end
end
