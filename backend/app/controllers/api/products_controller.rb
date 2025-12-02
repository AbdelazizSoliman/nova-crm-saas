module Api
  class ProductsController < BaseController
    before_action :set_product, only: %i[show update destroy]

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
        render json: product, status: :created
      else
        render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @product.update(product_params)
        render json: @product
      else
        render json: { errors: @product.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      if @product.update(is_active: false)
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
  end
end
