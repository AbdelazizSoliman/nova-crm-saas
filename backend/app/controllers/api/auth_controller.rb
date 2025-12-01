module Api
  class AuthController < ApplicationController
    # register أول حساب + owner user
    def register
      ActiveRecord::Base.transaction do
        account = Account.create!(
          name: params[:account_name],
          default_currency: params[:default_currency] || "USD"
        )

        user = account.users.create!(
          first_name: params[:first_name],
          last_name:  params[:last_name],
          email:      params[:email],
          role:       "owner",
          password:   params[:password],
          password_confirmation: params[:password_confirmation]
        )

        token = JsonWebToken.encode(user_id: user.id, account_id: account.id)

        render json: {
          token:,
          user: {
            id: user.id,
            name: "#{user.first_name} #{user.last_name}",
            email: user.email,
            role: user.role,
            account: {
              id: account.id,
              name: account.name,
              default_currency: account.default_currency
            }
          }
        }, status: :created
      end
    rescue ActiveRecord::RecordInvalid => e
      render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    # login بحساب موجود
    def login
      user = User.find_by(email: params[:email])

      if user&.authenticate(params[:password])
        token = JsonWebToken.encode(user_id: user.id, account_id: user.account_id)

        render json: {
          token:,
          user: {
            id: user.id,
            name: "#{user.first_name} #{user.last_name}",
            email: user.email,
            role: user.role,
            account_id: user.account_id
          }
        }, status: :ok
      else
        render json: { error: "Invalid email or password" }, status: :unauthorized
      end
    end
  end
end
