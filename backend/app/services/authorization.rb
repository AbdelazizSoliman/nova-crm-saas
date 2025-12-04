class Authorization
  class << self
    def can_manage_clients?(user)
      elevated_member?(user)
    end

    def can_manage_invoices?(user)
      elevated_member?(user)
    end

    def can_manage_products?(user)
      elevated_member?(user)
    end

    def can_manage_payments?(user)
      elevated_member?(user)
    end

    def can_view_settings?(user)
      elevated_member?(user)
    end

    def can_manage_settings?(user)
      owner?(user) || admin?(user)
    end

    def can_manage_billing?(user)
      owner?(user)
    end

    def can_view_billing?(user)
      owner?(user) || admin?(user)
    end

    def can_manage_team?(user)
      owner?(user) || admin?(user)
    end

    def active?(user)
      user&.active?
    end

    private

    def elevated_member?(user)
      owner?(user) || admin?(user) || manager?(user)
    end

    def owner?(user)
      active?(user) && user.role == "owner"
    end

    def admin?(user)
      active?(user) && user.role == "admin"
    end

    def manager?(user)
      active?(user) && user.role == "manager"
    end
  end
end
