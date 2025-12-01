module Api
  class PaymentsController < BaseController
    before_action :set_invoice

    # GET /api/invoices/:invoice_id/payments
    def index
      render json: @invoice.payments.order(paid_at: :desc)
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

    private

    def set_invoice
      @invoice = current_account.invoices.find(params[:invoice_id])
    end

    def payment_params
      params.require(:payment).permit(:amount, :paid_at, :method, :note)
    end
  end
end
