class ApplicationController < ActionController::API
  include ActionController::Cookies

  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :record_invalid

  private

  def authenticate_user!
    header = request.headers["Authorization"]
    token = header.split(" ").last if header.present?

    decoded = JsonWebToken.decode(token)
    if decoded && decoded["user_id"]
      @current_user = User.find_by(id: decoded["user_id"])
      @current_account = @current_user&.account
    end

    unless @current_user && Authorization.active?(@current_user)
      render json: { error: "Unauthorized" }, status: :unauthorized
      return
    end
  end

  def current_user
    @current_user
  end

  def current_account
    @current_account
  end

  def record_not_found
    render json: { error: "Not Found" }, status: :not_found
  end

  def record_invalid(exception)
    error_details = exception.record&.errors

    errors_hash = if error_details.present?
      error_details.to_hash(true)
    else
      { base: [exception.message] }
    end

    render json: { errors: errors_hash }, status: :unprocessable_entity
  end

  def render_forbidden(message = "Forbidden")
    render json: { error: message }, status: :forbidden
  end

  # ---- pagination helpers ----
  def pagination_params
    page     = params.fetch(:page, 1).to_i
    per_page = params.fetch(:per_page, 20).to_i
    per_page = 100 if per_page > 100
    { page:, per_page: }
  end

  def paginate(scope)
    page     = pagination_params[:page]
    per_page = pagination_params[:per_page]

    total     = scope.count
    total_pages = (total / per_page.to_f).ceil

    records = scope.offset((page - 1) * per_page).limit(per_page)

    [records, {
      current_page: page,
      per_page:,
      total_records: total,
      total_pages: total_pages
    }]
  end

  def demo_mode?
    ActiveModel::Type::Boolean.new.cast(ENV["DEMO_MODE"])
  end

  def demo_user?
    demo_mode? && current_user&.email&.casecmp(ENV.fetch("DEMO_USER_EMAIL", "demo@nova-crm.test"))&.zero?
  end

  def render_demo_mode_error
    render json: { error: "Action is disabled in demo mode." }, status: :forbidden
  end

  def prevent_demo_changes!
    return unless demo_user?

    render_demo_mode_error
    throw(:abort)
  end

  def ensure_uploads_allowed!
    return unless demo_mode?

    render_demo_mode_error
    throw(:abort)
  end
end
