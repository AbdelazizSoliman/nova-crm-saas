module Api
  class InvoicesController < BaseController
    before_action :set_invoice, only: %i[show update destroy pdf send_email]

    # GET /api/invoices
    def index
      scope = current_account.invoices
                             .includes(:client)
                             .order(created_at: :desc)

      # search by number or client name
      if params[:q].present?
        q = "%#{params[:q].strip.downcase}%"
        scope = scope.joins(:client).where(
          "LOWER(invoices.number) LIKE :q OR LOWER(clients.name) LIKE :q",
          q:
        )
      end

      # filter by status
      scope = scope.where(status: params[:status]) if params[:status].present?

      # filter by date range
      if params[:from].present?
        scope = scope.where("issue_date >= ?", params[:from])
      end
      if params[:to].present?
        scope = scope.where("issue_date <= ?", params[:to])
      end

      invoices, meta = paginate(scope)

      render json: {
        data: invoices.as_json(
          include: {
            client: { only: %i[id name contact_name email] }
          },
          only: %i[id number issue_date due_date currency tax_name tax_rate status subtotal tax_total total created_at]
        ),
        meta:
      }
    end


    # GET /api/invoices/:id
    def show
      render json: @invoice.as_json(
        include: {
          client: {
            only: %i[id name contact_name email]
          },
          invoice_items: {
            only: %i[id description quantity unit_price tax_rate line_total]
          },
          payments: {
            only: %i[id amount paid_at method note]
          }
        }
      )
    end

    # GET /api/invoices/:id/pdf
    def pdf
      pdf_data = InvoicePdfGenerator.new(@invoice).render

      send_data pdf_data,
                filename: "#{@invoice.number}.pdf",
                type: "application/pdf",
                disposition: "inline"
    end

    # POST /api/invoices/:id/send_email
    def send_email
      recipient = email_params[:recipient].presence || @invoice.client&.email
      subject   = email_params[:subject].presence || "Invoice #{@invoice.number}"
      message   = email_params[:message].presence || "Please find attached your invoice."

      unless recipient.present?
        return render json: { error: "Recipient email is required" }, status: :unprocessable_entity
      end

      InvoiceMailer.send_invoice(@invoice, recipient:, subject:, message:).deliver_now

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "invoice_sent_email",
        record: @invoice,
        metadata: {
          number: @invoice.number,
          recipient: recipient,
          subject: subject
        },
        request: request
      )

      render json: { success: true, message: "Email sent successfully." }
    rescue StandardError => e
      Rails.logger.error("Invoice email failed: #{e.message}")
      render json: { error: "Failed to send email: #{e.message}" }, status: :internal_server_error
    end

    # POST /api/invoices
    # يستقبل فاتورة + items + payments في نفس الريكوست
    def create
      invoice = current_account.invoices.new(base_invoice_params)
      invoice.client = current_account.clients.find(params[:client_id])

      build_items(invoice)
      build_payments(invoice)

      Invoice.transaction do
        invoice.save!
        invoice.recalculate_totals!
      end

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "invoice_created",
        record: invoice,
        metadata: {
          number: invoice.number,
          client_id: invoice.client_id,
          total: invoice.total,
          currency: invoice.currency,
          status: invoice.status
        },
        request: request
      )

      render json: invoice.as_json(
        include: {
          client: { only: %i[id name] },
          invoice_items: { only: %i[id description quantity unit_price tax_rate line_total] },
          payments: { only: %i[id amount paid_at method] }
        }
      ), status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    # PATCH/PUT /api/invoices/:id
    def update
      status_before = @invoice.status

      Invoice.transaction do
        @invoice.assign_attributes(base_invoice_params)
        @invoice.client = current_account.clients.find(params[:client_id]) if params[:client_id].present?

        @invoice.invoice_items.destroy_all
        @invoice.payments.destroy_all

        build_items(@invoice)
        build_payments(@invoice)

        @invoice.save!
        @invoice.recalculate_totals!
      end

      ActivityLogger.log(
        account: current_account,
        user: current_user,
        action: "invoice_updated",
        record: @invoice,
        metadata: {
          number: @invoice.number,
          status_before: status_before,
          status_after: @invoice.status,
          changes: @invoice.previous_changes.except("created_at", "updated_at")
        },
        request: request
      )

      render json: @invoice.as_json(
        include: {
          client: { only: %i[id name] },
          invoice_items: { only: %i[id description quantity unit_price tax_rate line_total] },
          payments: { only: %i[id amount paid_at method] }
        }
      )
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    # DELETE /api/invoices/:id
    def destroy
      @invoice.destroy
      head :no_content
    end

    def duplicate
      original = current_account.invoices.includes(:invoice_items).find(params[:id])

      dup_invoice = current_account.invoices.new(
        client_id: original.client_id,
        issue_date: Date.current,
        due_date: Date.current + 7.days,
        currency: original.currency,
        tax_rate: original.tax_rate,
        tax_name: original.tax_name,
        status: "draft",
        notes: "Duplicate of #{original.number}"
      )

      original.invoice_items.each do |item|
        dup_invoice.invoice_items.build(
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate
        )
      end

      Invoice.transaction do
        dup_invoice.save!
        dup_invoice.recalculate_totals!
      end

      render json: dup_invoice.as_json(
        include: {
          client: { only: %i[id name] },
          invoice_items: { only: %i[id description quantity unit_price tax_rate line_total] }
        }
      ), status: :created
    rescue ActiveRecord::RecordInvalid => e
      render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
    end

    private

    def set_invoice
      @invoice = current_account
                  .invoices
                  .includes(:client, :invoice_items, :payments)
                  .find(params[:id])
    end

    def email_params
      params.permit(:recipient, :subject, :message)
    end

    # بيانات الفاتورة الأساسية (بدون items/payments)
    def base_invoice_params
      defaults = {
        currency: current_account.default_currency,
        tax_rate: current_account.tax_rate,
        tax_name: current_account.tax_name
      }

      params
        .require(:invoice)
        .permit(:number, :issue_date, :due_date, :currency, :status, :notes, :tax_rate, :tax_name)
        .reverse_merge(defaults)
    end

    # items = [{ description, quantity, unit_price, tax_rate }]
    def build_items(invoice)
      items = params[:items] || []
      items.each do |item|
        product = find_product_for_item(item[:product_id])

        invoice.invoice_items.build(
          description: item[:description].presence || product&.name,
          quantity:    item[:quantity],
          unit_price:  item[:unit_price].presence || product&.unit_price,
          tax_rate:    invoice.tax_rate
        )
      end
    end

    # payments = [{ amount, paid_at, method, note }]
    def build_payments(invoice)
      payments = params[:payments] || []
      payments.each do |p|
        invoice.payments.build(
          amount:  p[:amount],
          paid_at: p[:paid_at] || Time.current,
          method:  p[:method] || "manual",
          note:    p[:note]
        )
      end
    end

    def find_product_for_item(product_id)
      return if product_id.blank?

      current_account.products.find_by(id: product_id)
    end
  end
end
