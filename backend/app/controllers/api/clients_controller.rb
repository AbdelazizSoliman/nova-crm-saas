module Api
  class ClientsController < BaseController
    before_action :set_client, only: %i[show update destroy]

   def index
      scope = current_account.clients.order(created_at: :desc)

      if params[:q].present?
        q = "%#{params[:q].strip.downcase}%"
        scope = scope.where(
          "LOWER(name) LIKE :q OR LOWER(contact_name) LIKE :q OR LOWER(email) LIKE :q",
          q:
        )
      end

      clients, meta = paginate(scope)

      render json: {
        data: clients.as_json(only: %i[id name contact_name email phone country created_at]),
        meta:
      }
    end


    def show
      render json: @client
    end

    def create
      client = current_account.clients.new(client_params)
      if client.save
        render json: client, status: :created
      else
        render json: { errors: client.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @client.update(client_params)
        render json: @client
      else
        render json: { errors: @client.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      @client.destroy
      head :no_content
    end

    private

    def set_client
      @client = current_account.clients.find(params[:id])
    end

    def client_params
      params.require(:client).permit(:name, :contact_name, :email, :phone, :address, :country, :notes)
    end
  end
end
