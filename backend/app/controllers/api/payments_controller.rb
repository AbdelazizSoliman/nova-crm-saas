module Api
  class PaymentsController < BaseController
    before_action :set_invoice, only: %i[index create], if: -> { params[:invoice_id].present? }
    before_action :set_payment, only: %i[destroy]

    # GET /api/invoices/:invoice_id/payments
    def index
      if @invoice
        render_invoice_payments
        return
      end

      scope = Payment
              .joins(invoice: :client)
              .where(invoices: { account_id: current_account.id })
              .order(paid_at: :desc)

      if params[:q].present?
        q = "%#{params[:q].strip.downcase}%"
        scope = scope.where(
          "LOWER(invoices.number) LIKE :q OR LOWER(clients.name) LIKE :q OR LOWER(payments.method) LIKE :q",
          q:,
        )
      end

      scope = scope.where("payments.paid_at >= ?", params[:from_date]) if params[:from_date].present?
      scope = scope.where("payments.paid_at <= ?", params[:to_date]) if params[:to_date].present?
      scope = scope.where(method: params[:method]) if params[:method].present?
      scope = scope.where("payments.amount >= ?", params[:min_amount]) if params[:min_amount].present?
      scope = scope.where("payments.amount <= ?", params[:max_amount]) if params[:max_amount].present?

      payments, meta = paginate(scope)

      render json: {
        data: payments.as_json(
          only: %i[id amount paid_at method note],
          include: {
            invoice: {
              only: %i[id number currency],
              include: { client: { only: %i[id name] } },
            },
          },
        ),
        meta:,
      }
    end

    # POST /api/invoices/:invoice_id/payments
    def create
      payment = @invoice.payments.new(payment_params)

      if payment.save
        @invoice.recalculate_totals!
        render json: payment, status: :created
      else
        render json: { errors: payment.errors.full_messages }, status: :unprocessable_entity
      end
    end

    # DELETE /api/payments/:id
    def destroy
      invoice = @payment.invoice
      @payment.destroy!
      invoice.recalculate_totals!

      render json: { success: true }
    end

    private

    def render_invoice_payments
      render json: @invoice.payments.order(paid_at: :desc)
    end

    def set_invoice
      @invoice = current_account.invoices.find(params[:invoice_id])
    end

    def set_payment
      @payment = Payment.joins(:invoice)
                        .where(invoices: { account_id: current_account.id })
                        .find(params[:id])
    end

    def payment_params
      params.require(:payment).permit(:amount, :paid_at, :method, :note)
    end
  end
end
