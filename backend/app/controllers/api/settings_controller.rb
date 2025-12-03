require "image_processing/mini_magick"

module Api
  class SettingsController < BaseController
    rescue_from ActiveRecord::RecordInvalid, with: :record_invalid

    def show
      render json: serialized_settings
    end

    def invoice_branding
      render json: branding_payload
    end

    def update_invoice_branding
      current_account.assign_attributes(invoice_branding_params)

      attach_invoice_logo!

      current_account.save!

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "invoice_branding_updated",
        record: current_account,
        metadata: invoice_branding_params.compact.merge(logo: current_account.invoice_logo.attached?),
        request: request
      )

      render json: branding_payload
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

    def invoice_branding_params
      params.permit(:invoice_template, :brand_color, :footer_text, :additional_note)
    end

    def attach_invoice_logo!
      logo_file = params[:logo]

      if ActiveModel::Type::Boolean.new.cast(params[:remove_logo])
        current_account.invoice_logo.purge if current_account.invoice_logo.attached?
        return
      end

      return unless logo_file.present?

      unless logo_file.content_type.in?(%w[image/png image/jpeg image/svg+xml])
        current_account.errors.add(:invoice_logo, "must be a PNG, JPG, or SVG file")
        raise ActiveRecord::RecordInvalid.new(current_account)
      end

      processed_file = process_logo_file(logo_file)

      current_account.invoice_logo.attach(
        io: processed_file[:io],
        filename: processed_file[:filename],
        content_type: processed_file[:content_type]
      )
    ensure
      io = processed_file && processed_file[:io]
      io&.close if io.respond_to?(:close)
      io&.unlink if io.is_a?(Tempfile)
    end

    def process_logo_file(file)
      return { io: file.tempfile, filename: file.original_filename || "logo", content_type: file.content_type } if file.content_type == "image/svg+xml"

      processed = ImageProcessing::MiniMagick
        .source(file.tempfile)
        .resize_to_limit(600, 600)
        .call

      { io: processed, filename: file.original_filename || "logo", content_type: file.content_type }
    end

    def branding_payload
      account = current_account
      logo_representation =
        begin
          if account.invoice_logo.variable?
            account.invoice_logo.variant(resize_to_limit: [320, 320]).processed
          else
            account.invoice_logo
          end
        rescue StandardError => e
          Rails.logger.warn("Invoice logo preview failed: #{e.message}")
          nil
        end if account.invoice_logo.attached?

      {
        invoice_template: account.invoice_template_key,
        brand_color: account.invoice_brand_color,
        footer_text: account.footer_text,
        additional_note: account.additional_note,
        logo_url: (logo_representation ? url_for(logo_representation) : nil)
      }
    end

    def record_invalid(exception)
      render json: { errors: exception.record.errors.full_messages.presence || [exception.message] }, status: :unprocessable_entity
    end
  end
end
