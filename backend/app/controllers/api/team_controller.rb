module Api
  class TeamController < BaseController
    before_action :authorize_team_view!
    before_action :authorize_team_management!, only: %i[invite update destroy]
    before_action :set_user, only: %i[update destroy]

    def index
      users = current_account.users.order(created_at: :asc)

      render json: users.map { |user| team_payload(user) }
    end

    def invite
      if plan_limit_reached?
        return render json: { error: "User limit reached for your current plan" }, status: :unprocessable_entity
      end

      user = current_account.users.new(
        first_name: invite_name_parts.first,
        last_name: invite_name_parts.second,
        email: params[:email],
        role: params[:role] || "viewer",
        status: :active,
        password: SecureRandom.hex(12)
      )

      if user.save
        ActivityLogger.log(
          account: current_account,
          user: current_user,
          action: "user_invited",
          record: user,
          metadata: { email: user.email, role: user.role },
          request: request
        )

        notify_user_invited(user)

        render json: team_payload(user), status: :created
      else
        render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      return render_forbidden("You cannot change your own role") if updating_own_role?
      return render_forbidden("Admins cannot change the owner role") if changing_owner_as_admin?

      old_role = @user.role
      old_status = @user.status

      assign_role_change
      assign_status_change

      if @user.errors.any?
        return render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
      end

      if @user.active? && plan_limit_reached?
        return render json: { error: "User limit reached for your current plan" }, status: :unprocessable_entity
      end

      if @user.save
        log_role_change(old_role)
        log_deactivation(old_status)

        notify_role_change(@user, old_role)
        notify_user_deactivated(@user, old_status)

        render json: team_payload(@user)
      else
        render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      if @user == current_user
        return render_forbidden("You cannot deactivate yourself")
      end

      if @user.owner? && !current_user.owner?
        return render_forbidden("Admins cannot deactivate the owner")
      end

      old_status = @user.status
      @user.status = :deactivated

      if @user.save
        ActivityLogger.log(
          account: current_account,
          user: current_user,
          action: "user_deactivated",
          record: @user,
          metadata: { user_id: @user.id },
          request: request
        )

        notify_user_deactivated(@user, old_status)

        render json: team_payload(@user)
      else
        render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def team_payload(user)
      {
        id: user.id,
        name: user.name.presence || user.email,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
      }
    end

    def set_user
      @user = current_account.users.find(params[:id])
    end

    def authorize_team_view!
      render_forbidden unless Authorization.can_manage_team?(current_user)
    end

    def authorize_team_management!
      render_forbidden unless Authorization.can_manage_team?(current_user)
    end

    def invite_name_parts
      @invite_name_parts ||= begin
        name = params[:name].to_s.strip
        name_parts = name.split(" ", 2)
        [name_parts[0], name_parts[1]]
      end
    end

    def updating_own_role?
      params[:role].present? && current_user.id == @user.id
    end

    def changing_owner_as_admin?
      @user.owner? && current_user.admin? && params[:role].present?
    end

    def assign_role_change
      return unless params[:role].present?

      @user.role = params[:role]
    end

    def assign_status_change
      requested_status = params[:status]

      if params.key?(:deactivated)
        requested_status = ActiveModel::Type::Boolean.new.cast(params[:deactivated]) ? "deactivated" : "active"
      end

      return unless requested_status.present?

      if @user.owner? && requested_status == "deactivated" && !another_active_owner_exists?
        @user.errors.add(:base, "Account must have at least one active owner")
        return
      end

      @user.status = requested_status
    end

    def another_active_owner_exists?
      current_account.users.where(role: :owner, status: :active).where.not(id: @user.id).exists?
    end

    def plan_limit_reached?
      max_users = current_account.current_plan&.max_users
      return false unless max_users.present?

      current_account.users.where(status: :active).count >= max_users
    end

    def log_role_change(old_role)
      return if old_role == @user.role

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "user_role_changed",
        record: @user,
        metadata: { user_id: @user.id, old_role:, new_role: @user.role },
        request: request
      )
    end

    def log_deactivation(previous_status)
      return unless previous_status != @user.status && @user.deactivated?

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "user_deactivated",
        record: @user,
        metadata: { user_id: @user.id },
        request: request
      )
    end

    def notify_user_invited(user)
      NotificationsService.notify_account_admins(
        account: current_account,
        title: "User invited",
        body: "#{current_user.name.presence || current_user.email} invited #{user.name.presence || user.email}.",
        action: "user_invited",
        notifiable: user
      )
    end

    def notify_role_change(user, old_role)
      return if old_role == user.role

      NotificationsService.notify_user_and_admins(
        user: user,
        title: "User role changed",
        body: "Role updated from #{old_role} to #{user.role}.",
        action: "user_role_changed",
        notifiable: user
      )
    end

    def notify_user_deactivated(user, previous_status)
      return unless previous_status != user.status && user.deactivated?

      NotificationsService.notify_user_and_admins(
        user: user,
        title: "User deactivated",
        body: "#{user.name.presence || user.email} has been deactivated.",
        action: "user_deactivated",
        notifiable: user
      )
    end
  end
end
