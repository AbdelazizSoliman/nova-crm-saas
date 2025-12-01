class User < ApplicationRecord
  belongs_to :account

  has_secure_password

  validates :email, presence: true, uniqueness: { scope: :account_id }
  enum :role, { owner: "owner", staff: "staff" }
end
