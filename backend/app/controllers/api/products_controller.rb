module Api
  class ProductsController < BaseController
    before_action :set_product, only: %i[show update destroy]
    before_action :authorize_manage_products!, only: %i[create update destroy]

    def index
      scope = current_account.products.order(created_at: :desc)
      scope = scope.where(product_type: params[:product_type]) if params[:product_type].present?
      scope = scope.active if ActiveModel::Type::Boolean.new.cast(params[:only_active])

      if params[:q].present?
        q = "%#{params[:q].strip.downcase}%"
        scope = scope.where(
          "LOWER(name) LIKE :q OR LOWER(COALESCE(sku, '')) LIKE :q OR LOWER(COALESCE(description, '')) LIKE :q",
          q:
        )
      end

      products, meta = paginate(scope)

      render json: {
        data: products.as_json(only: %i[
          id name sku description unit_price default_tax_rate currency product_type category is_active created_at
        ]),
        meta:
      }
    end

    def show
      render json: @product
    end

    def create
      product = current_account.products.new(product_params)

      if product.save
        ActivityLogger.log(
          account: current_account,
          user: current_user,
          action: "product_created",
          record: product,
          metadata: {
            name: product.name,
            sku: product.sku,
            unit_price: product.unit_price,
            product_type: product.product_type
          },
          request: request
        )
        render json: product, status: :created
      else
        render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @product.update(product_params)
        ActivityLogger.log(
          account: current_account,
          user: current_user,
          action: "product_updated",
          record: @product,
          metadata: {
            name: @product.name,
            sku: @product.sku,
            changes: @product.previous_changes.except("created_at", "updated_at")
          },
          request: request
        )
        render json: @product
      else
        render json: { errors: @product.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      if @product.update(is_active: false)
        ActivityLogger.log(
          account: current_account,
          user: current_user,
          action: "product_deactivated",
          record: @product,
          metadata: {
            name: @product.name,
            sku: @product.sku
          },
          request: request
        )
        render json: { success: true }
      else
        render json: { errors: @product.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def autocomplete
      scope = current_account.products.active.order(:name)
      if params[:q].present?
        q = "%#{params[:q].strip.downcase}%"
        scope = scope.where(
          "LOWER(name) LIKE :q OR LOWER(COALESCE(sku, '')) LIKE :q",
          q:
        )
      end

      results = scope.limit(20).select(:id, :name, :sku, :description, :unit_price, :default_tax_rate, :currency)

      render json: results
    end

    private

    def set_product
      @product = current_account.products.find(params[:id])
    end

    def product_params
      params.require(:product).permit(
        :name,
        :sku,
        :description,
        :unit_price,
        :default_tax_rate,
        :currency,
        :product_type,
        :category,
        :is_active
      )
    end

    def authorize_manage_products!
      render_forbidden unless Authorization.can_manage_products?(current_user)
    end
  end
end
