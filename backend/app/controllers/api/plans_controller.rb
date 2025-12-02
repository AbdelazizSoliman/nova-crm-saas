module Api
  class PlansController < BaseController
    def index
      plans = Plan.active.order(price: :asc)

      render json: plans.map { |plan| plan_payload(plan) }
    end

    private

    def plan_payload(plan)
      plan.slice(
        :id,
        :name,
        :code,
        :price,
        :currency,
        :interval,
        :description,
        :max_users,
        :max_clients,
        :max_invoices_per_month,
        :max_storage_mb
      )
    end
  end
end
