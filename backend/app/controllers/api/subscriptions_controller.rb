module Api
  class SubscriptionsController < BaseController
    before_action :set_current_subscription, only: %i[show update]

    def show
      render json: subscription_response(@subscription)
    end

    def create
      plan = Plan.active.find_by(id: subscription_params[:plan_id])
      return render json: { error: "Plan not found" }, status: :not_found unless plan

      subscription = nil

      ApplicationRecord.transaction do
        current_account.subscriptions.current.update_all(status: "canceled")

        period_start = Time.current
        period_end = plan.interval == "year" ? period_start + 1.year : period_start + 1.month

        subscription = current_account.subscriptions.create!(
          plan: plan,
          status: "active",
          current_period_start: period_start,
          current_period_end: period_end
        )

        ActivityLogger.log(
          account: current_account,
          user: current_user,
          action: "subscription_created",
          record: subscription,
          metadata: { plan_id: plan.id },
          request: request
        )
      end

      render json: subscription_response(subscription), status: :created
    end

    def update
      return render json: { error: "No active subscription" }, status: :not_found unless @subscription

      new_plan = if subscription_params[:plan_id]
        Plan.active.find_by(id: subscription_params[:plan_id])
      end

      return render json: { error: "Plan not found" }, status: :not_found if subscription_params[:plan_id] && new_plan.blank?

      ApplicationRecord.transaction do
        if new_plan && new_plan != @subscription.plan
          @subscription.plan = new_plan
          ActivityLogger.log(
            account: current_account,
            user: current_user,
            action: "subscription_plan_changed",
            record: @subscription,
            metadata: { plan_id: new_plan.id },
            request: request
          )
        end

        if subscription_params.key?(:cancel_at_period_end)
          cancel_value = ActiveModel::Type::Boolean.new.cast(subscription_params[:cancel_at_period_end])
          @subscription.cancel_at_period_end = cancel_value

          ActivityLogger.log(
            account: current_account,
            user: current_user,
            action: cancel_value ? "subscription_marked_for_cancellation" : "subscription_cancellation_removed",
            record: @subscription,
            metadata: {},
            request: request
          )
        end

        @subscription.save!
      end

      render json: subscription_response(@subscription)
    end

    private

    def set_current_subscription
      @subscription = current_account.current_subscription
    end

    def subscription_response(subscription)
      {
        subscription: subscription && subscription_payload(subscription),
        plan: subscription&.plan && plan_payload(subscription.plan)
      }
    end

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

    def subscription_payload(subscription)
      subscription.slice(
        :id,
        :status,
        :cancel_at_period_end,
        :current_period_start,
        :current_period_end,
        :trial_ends_at
      ).merge(days_left: subscription.days_left)
    end

    def subscription_params
      params.permit(:plan_id, :cancel_at_period_end)
    end
  end
end
