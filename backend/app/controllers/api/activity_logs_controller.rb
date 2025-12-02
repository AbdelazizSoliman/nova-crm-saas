module Api
  class ActivityLogsController < BaseController
    def index
      scope = current_account.activity_logs.includes(:user).order(created_at: :desc)

      scope = scope.where(user_id: params[:user_id]) if params[:user_id].present?
      scope = scope.where(record_type: params[:record_type]) if params[:record_type].present?

      if params[:from].present?
        from_date = parse_date(params[:from])&.beginning_of_day
        scope = scope.where("created_at >= ?", from_date) if from_date
      end

      if params[:to].present?
        to_date = parse_date(params[:to])&.end_of_day
        scope = scope.where("created_at <= ?", to_date) if to_date
      end

      if params[:q].present?
        q = "%#{params[:q].strip.downcase}%"
        scope = scope.where("LOWER(action) LIKE :q OR LOWER(CAST(metadata AS TEXT)) LIKE :q", q: q)
      end

      logs, meta = paginate(scope)

      render json: {
        data: logs.map { |log| serialize_log(log) },
        meta: meta
      }
    end

    private

    def serialize_log(log)
      {
        id: log.id,
        action: log.action,
        record_type: log.record_type,
        record_id: log.record_id,
        metadata: log.metadata,
        created_at: log.created_at,
        user: log.user && {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email
        }
      }
    end

    def parse_date(value)
      Date.parse(value)
    rescue ArgumentError
      nil
    end
  end
end
