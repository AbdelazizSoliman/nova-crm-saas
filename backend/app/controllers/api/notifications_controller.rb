module Api
  class NotificationsController < BaseController
    before_action :set_notification, only: %i[mark_read]

    def index
      scope = current_user.notifications.where(account: current_account).recent_first
      scope = scope.unread if ActiveModel::Type::Boolean.new.cast(params[:unread])

      notifications, meta = paginate(scope)

      render json: {
        data: notifications.as_json(only: %i[id title body action read created_at notifiable_type notifiable_id]),
        meta:
      }
    end

    def unread_count
      count = current_user.notifications.where(account: current_account, read: false).count
      render json: { count: }
    end

    def mark_read
      @notification.update(read: true)
      render json: { success: true }
    end

    def mark_all_read
      current_user.notifications.where(account: current_account, read: false).update_all(read: true, updated_at: Time.current)
      render json: { success: true }
    end

    private

    def set_notification
      @notification = current_user.notifications.where(account: current_account).find(params[:id])
    end
  end
end
