class NotificationsService
  class << self
    def notify(user:, title:, body:, action:, notifiable: nil)
      return unless user&.account

      Notification.create!(
        account: user.account,
        user: user,
        title: title,
        body: body,
        action: action,
        notifiable: notifiable
      )
    rescue StandardError => e
      Rails.logger.error("Notification error: #{e.message}")
      nil
    end

    def notify_account_admins(account:, title:, body:, action:, notifiable: nil, include_admins: true)
      return unless account

      roles = include_admins ? %w[owner admin] : %w[owner]
      account
        .users
        .where(status: :active, role: roles)
        .find_each do |user|
          notify(user: user, title: title, body: body, action: action, notifiable: notifiable)
        end
    end

    def notify_user_and_admins(user:, title:, body:, action:, notifiable: nil, include_admins: true)
      return unless user&.account

      roles = include_admins ? %w[owner admin] : %w[owner]
      recipients = [user]
      recipients += user.account.users.where(status: :active, role: roles)

      recipients.uniq.each do |recipient|
        notify(user: recipient, title: title, body: body, action: action, notifiable: notifiable)
      end
    end
  end
end
