module Api
  class ClientsController < BaseController
    before_action :set_client, only: %i[show update destroy]
    before_action :authorize_manage_clients!, only: %i[create update destroy]

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
        ActivityLogger.log(
          account: current_account,
          user: current_user,
          action: "client_created",
          record: client,
          metadata: {
            name: client.name,
            email: client.email,
            country: client.country
          },
          request: request
        )
        render json: client, status: :created
      else
        render json: { errors: client.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      if @client.update(client_params)
        ActivityLogger.log(
          account: current_account,
          user: current_user,
          action: "client_updated",
          record: @client,
          metadata: {
            name: @client.name,
            email: @client.email,
            changes: @client.previous_changes.except("created_at", "updated_at")
          },
          request: request
        )
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

    def authorize_manage_clients!
      render_forbidden unless Authorization.can_manage_clients?(current_user)
    end
  end
end
