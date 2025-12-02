class ApplicationController < ActionController::API
  include ActionController::Cookies

  rescue_from ActiveRecord::RecordNotFound, with: :record_not_found

  private

  def authenticate_user!
    header = request.headers["Authorization"]
    token = header.split(" ").last if header.present?

    decoded = JsonWebToken.decode(token)
    if decoded && decoded["user_id"]
      @current_user = User.find_by(id: decoded["user_id"])
      @current_account = @current_user&.account
    end

    render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
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
    render json: { errors: exception.record.errors.full_messages }, status: :unprocessable_entity
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
end
