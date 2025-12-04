class User < ApplicationRecord
  belongs_to :account
  has_many :activity_logs, dependent: :nullify

  has_secure_password

  validates :email, presence: true, uniqueness: { scope: :account_id }
  enum :role, { owner: "owner", admin: "admin", manager: "manager", viewer: "viewer" }
  enum :status, { active: "active", deactivated: "deactivated" }

  validates :role, inclusion: { in: roles.keys }
  validates :status, inclusion: { in: statuses.keys }

  validates :job_title, length: { maximum: 100 }, allow_blank: true
  validates :phone, length: { maximum: 30 }, allow_blank: true
  validates :avatar_url, length: { maximum: 255 }, allow_blank: true
  validates :locale, length: { maximum: 10 }, allow_blank: true
  validates :timezone, length: { maximum: 100 }, allow_blank: true

  validate :ensure_account_has_active_owner, if: :will_lose_owner_access?
  before_destroy :prevent_removing_last_owner

  def name
    [first_name, last_name].compact.join(" ").strip
  end

  private

  def will_lose_owner_access?
    return false unless account

    losing_owner_role? || deactivating_owner?
  end

  def losing_owner_role?
    will_save_change_to_role? && role_was == "owner" && role != "owner"
  end

  def deactivating_owner?
    will_save_change_to_status? && role == "owner" && status == "deactivated"
  end

  def ensure_account_has_active_owner
    return if account.users.where(role: "owner", status: "active").where.not(id: id).exists?

    errors.add(:base, "Account must have at least one active owner")
  end

  def prevent_removing_last_owner
    return unless role == "owner"
    return if account.users.where(role: "owner", status: "active").where.not(id: id).exists?

    errors.add(:base, "Account must have at least one active owner")
    throw :abort
  end
end
