module Api
  class DashboardController < BaseController
    def summary
      account = current_account
      range_days = parse_range_days(params[:range])

      range_end   = Date.current
      range_start = range_end - (range_days - 1)

      invoices_scope = account.invoices

      date_field_sql = "COALESCE(invoices.issue_date, invoices.created_at)"
      ranged_invoices = invoices_scope.where(
        "#{date_field_sql} BETWEEN :start AND :end",
        { start: range_start, end: range_end }
      )

      paid_or_partial_invoice_ids = ranged_invoices
                                    .left_joins(:payments)
                                    .group("invoices.id")
                                    .having("invoices.status = 'paid' OR COALESCE(SUM(payments.amount), 0) > 0")
                                    .pluck(:id)

      revenue_scope = ranged_invoices.where(id: paid_or_partial_invoice_ids)

      revenue_timeseries = revenue_scope
                            .group("DATE(#{date_field_sql})")
                            .order(Arel.sql("DATE(#{date_field_sql})"))
                            .pluck(
                              Arel.sql("DATE(#{date_field_sql}) as day"),
                              Arel.sql("SUM(total) as total_revenue"),
                              Arel.sql("COUNT(*) as paid_invoices_count")
                            )
                            .map do |day, total_revenue, paid_invoices_count|
                              {
                                date: day,
                                total_revenue: total_revenue.to_f,
                                paid_invoices_count: paid_invoices_count
                              }
                            end

      status_breakdown = invoices_scope
                          .group(:status)
                          .pluck(Arel.sql("status"), Arel.sql("COUNT(*)"), Arel.sql("SUM(total)"))
                          .to_h do |status, count, total|
                            [status, { status:, count:, total_amount: total.to_f }]
                          end

      invoice_status_breakdown = Invoice::STATUSES.map do |status|
        status_breakdown.fetch(status, { status:, count: 0, total_amount: 0 })
      end

      top_clients = revenue_scope
                    .joins(:client)
                    .group("clients.id", "clients.name")
                    .order(Arel.sql("SUM(invoices.total) DESC"))
                    .limit(5)
                    .pluck(
                      Arel.sql("clients.id"),
                      Arel.sql("clients.name"),
                      Arel.sql("COUNT(invoices.id) as invoices_count"),
                      Arel.sql("SUM(invoices.total) as total_revenue")
                    )
                    .map do |id, name, invoices_count, total_revenue|
                      {
                        client_id: id,
                        client_name: name,
                        invoices_count: invoices_count,
                        total_revenue: total_revenue.to_f
                      }
                    end

      render json: {
        metrics: {
          range_days: range_days,
          total_revenue: revenue_scope.sum(:total).to_f,
          outstanding_invoices_amount: invoices_scope.where(status: %w[sent overdue]).sum(:total).to_f,
          overdue_invoices_count: invoices_scope.where.not(status: "paid").where("due_date < ?", Date.current).count,
          clients_count: account.clients.count,
          invoices_count: ranged_invoices.count,
          average_invoice_value: revenue_scope.average(:total).to_f,
          active_subscription_plan: account.current_plan&.code || account.current_plan&.name,
          subscription_status: account.current_subscription&.status
        },
        charts: {
          revenue_timeseries: revenue_timeseries,
          invoice_status_breakdown: invoice_status_breakdown
        },
        top_clients: top_clients
      }
    end

    private

    def parse_range_days(range_param)
      return 30 unless range_param.present?

      if range_param =~ /(\d+)d/i
        [$1.to_i, 7].max.clamp(7, 180)
      else
        30
      end
    end
  end
end
