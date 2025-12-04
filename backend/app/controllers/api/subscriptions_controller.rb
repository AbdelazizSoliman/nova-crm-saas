module Api
  class SubscriptionsController < BaseController
    before_action :set_current_subscription, only: %i[show update]
    before_action :authorize_billing_view!, only: %i[show]
    before_action :authorize_billing_management!, only: %i[create update]
    before_action :prevent_demo_changes!, only: %i[create update]

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

        notify_subscription_created(subscription)
      end

      render json: subscription_response(subscription), status: :created
    end

    def update
      return render json: { error: "No active subscription" }, status: :not_found unless @subscription

      new_plan = if subscription_params[:plan_id]
        Plan.active.find_by(id: subscription_params[:plan_id])
      end

      return render json: { error: "Plan not found" }, status: :not_found if subscription_params[:plan_id] && new_plan.blank?

      plan_changed = false

      ApplicationRecord.transaction do
        if new_plan && new_plan != @subscription.plan
          plan_changed = true
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

          notify_cancellation_change(@subscription, cancel_value)
        end

        @subscription.save!
      end

      notify_plan_change(@subscription) if plan_changed

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

    def authorize_billing_view!
      render_forbidden unless Authorization.can_view_billing?(current_user)
    end

    def authorize_billing_management!
      render_forbidden unless Authorization.can_manage_billing?(current_user)
    end

    def notify_subscription_created(subscription)
      NotificationsService.notify_account_admins(
        account: current_account,
        title: "Subscription started",
        body: "Subscribed to #{subscription.plan.name} plan.",
        action: "subscription_created",
        notifiable: subscription
      )
    end

    def notify_plan_change(subscription)
      NotificationsService.notify_account_admins(
        account: current_account,
        title: "Plan changed",
        body: "Subscription updated to #{subscription.plan.name} plan.",
        action: "subscription_updated",
        notifiable: subscription
      )
    end

    def notify_cancellation_change(subscription, cancel_value)
      NotificationsService.notify_account_admins(
        account: current_account,
        title: cancel_value ? "Cancellation scheduled" : "Cancellation removed",
        body: cancel_value ? "Subscription will end at period end." : "Subscription cancellation was removed.",
        action: cancel_value ? "subscription_cancellation_scheduled" : "subscription_cancellation_removed",
        notifiable: subscription
      )
    end
  end
end
