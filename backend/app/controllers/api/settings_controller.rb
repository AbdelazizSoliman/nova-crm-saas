module Api
  class SettingsController < BaseController
    rescue_from ActiveRecord::RecordInvalid, with: :record_invalid

    def show
      render json: serialized_settings
    end

    def update_profile
      current_user.update!(profile_attributes)

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "profile_updated",
        record: current_user,
        metadata: {
          changes: current_user.previous_changes.except("created_at", "updated_at", "password_digest")
        },
        request: request
      )

      render json: { profile: profile_payload(current_user) }
    end

    def update_account
      current_account.update!(account_params.merge(invoicing_params))

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "account_settings_updated",
        record: current_account,
        metadata: {
          changes: current_account.previous_changes.except("created_at", "updated_at")
        },
        request: request
      )

      render json: serialized_settings.slice(:account, :invoicing)
    end

    private

    def profile_attributes
      attributes = profile_params.except(:name)

      if profile_params[:name].present?
        first_name, last_name = profile_params[:name].split(" ", 2)
        attributes[:first_name] = first_name
        attributes[:last_name] = last_name
      end

      attributes
    end

    def serialized_settings
      {
        profile: profile_payload(current_user),
        account: account_payload(current_account),
        invoicing: invoicing_payload(current_account)
      }
    end

    def profile_payload(user)
      {
        name: user.name,
        email: user.email,
        job_title: user.job_title,
        phone: user.phone,
        avatar_url: user.avatar_url,
        locale: user.locale,
        timezone: user.timezone
      }
    end

    def account_payload(account)
      account.as_json(only: %i[
        company_name
        company_address
        company_phone
        company_website
        company_tax_id
        company_logo_url
      ])
    end

    def invoicing_payload(account)
      account.as_json(only: %i[
        default_currency
        invoice_prefix
        default_tax_rate
        tax_rate
        tax_name
        tax_inclusive
        default_payment_terms_days
      ])
    end

    def profile_params
      params.require(:profile).permit(:name, :job_title, :phone, :avatar_url, :locale, :timezone)
    end

    def account_params
      params.fetch(:account, {}).permit(
        :company_name,
        :company_address,
        :company_phone,
        :company_website,
        :company_tax_id,
        :company_logo_url
      )
    end

    def invoicing_params
      params.fetch(:invoicing, {}).permit(
        :default_currency,
        :invoice_prefix,
        :default_tax_rate,
        :default_payment_terms_days,
        :tax_rate,
        :tax_name,
        :tax_inclusive
      )
    end
  end
end
