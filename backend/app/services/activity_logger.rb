class ActivityLogger
  def self.log(account:, user: nil, action:, record: nil, metadata: {}, request: nil)
    ActivityLog.create!(
      account: account,
      user: user,
      action: action,
      record_type: record&.class&.name,
      record_id: record&.id,
      metadata: metadata || {},
      ip: request&.ip,
      user_agent: request&.user_agent,
    )
  rescue StandardError => e
    Rails.logger.error("Activity log failed: #{e.message}")
    nil
  end
end
