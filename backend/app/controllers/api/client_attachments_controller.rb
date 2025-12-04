module Api
  class ClientAttachmentsController < BaseController
    rescue_from ActiveRecord::RecordInvalid, with: :record_invalid
    before_action :set_client
    before_action :authorize_manage_clients!, only: %i[create destroy]
    before_action :ensure_uploads_allowed!, only: %i[create destroy]

    def index
      render json: { attachments: serialize_attachments(@client.attachments) }
    end

    def create
      files = Array.wrap(params[:attachments] || params[:attachment])
      if files.blank?
        return render json: { errors: ["Please choose at least one file to upload"] }, status: :unprocessable_entity
      end

      files.each do |file|
        validate_attachment!(file)
        @client.attachments.attach(file)
      end

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "client_attachments_uploaded",
        record: @client,
        metadata: { count: files.size },
        request: request
      )

      render json: { attachments: serialize_attachments(@client.attachments.reload) }, status: :created
    end

    def destroy
      attachment = @client.attachments.find_by(id: params[:id])
      return render_not_found unless attachment

      attachment.purge

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "client_attachment_removed",
        record: @client,
        metadata: { attachment_id: attachment.id, filename: attachment.filename.to_s },
        request: request
      )

      head :no_content
    end

    private

    def set_client
      @client = current_account.clients.find(params[:client_id] || params[:id])
    end

    def authorize_manage_clients!
      render_forbidden unless Authorization.can_manage_clients?(current_user)
    end

    def validate_attachment!(file)
      allowed_types = %w[application/pdf application/vnd.openxmlformats-officedocument.wordprocessingml.document application/vnd.openxmlformats-officedocument.spreadsheetml.sheet image/png image/jpeg image/jpg]
      unless file&.content_type&.in?(allowed_types)
        raise ActiveRecord::RecordInvalid.new(
          @client.tap { |c| c.errors.add(:attachments, "must be PDF, DOCX, XLSX, PNG, or JPG") }
        )
      end
    end

    def serialize_attachments(attachments)
      attachments.map do |attachment|
        {
          id: attachment.id,
          filename: attachment.filename.to_s,
          byte_size: attachment.byte_size,
          content_type: attachment.content_type,
          created_at: attachment.created_at,
          url: url_for(attachment)
        }
      end
    end

    def render_not_found
      render json: { error: "Attachment not found" }, status: :not_found
    end
  end
end
