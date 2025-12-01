module Api
  class DashboardController < BaseController
    def summary
      account = current_account

      today      = Date.current
      month_start = today.beginning_of_month
      month_end   = today.end_of_month

      invoices_scope = account.invoices

      total_invoices_count   = invoices_scope.count
      total_clients_count    = account.clients.count

      month_invoices = invoices_scope.where(issue_date: month_start..month_end)
      month_total    = month_invoices.sum(:total)
      month_paid     = month_invoices.joins(:payments).distinct.sum(:total)
      # لو عايز دقة أكتر ممكن تجمع من payments مباشرة

      overdue_invoices = invoices_scope.where(status: "overdue")
      overdue_total    = overdue_invoices.sum(:total)

      top_clients = account.clients
                           .joins(:invoices)
                           .group("clients.id", "clients.name")
                           .order("SUM(invoices.total) DESC")
                           .limit(5)
                           .pluck("clients.id", "clients.name", "SUM(invoices.total) AS total_spent")

      monthly_series = (0..5).map do |i|
        month = month_start - i.months
        from  = month.beginning_of_month
        to    = month.end_of_month

        total = invoices_scope.where(issue_date: from..to).sum(:total)

        {
          month: month.strftime("%Y-%m"),
          total:
        }
      end.reverse

      render json: {
        totals: {
          invoices_count: total_invoices_count,
          clients_count:  total_clients_count,
          month_total:    month_total,
          month_paid:     month_paid,
          overdue_total:  overdue_total
        },
        top_clients: top_clients.map { |id, name, total_spent|
          { id:, name:, total_spent: }
        },
        monthly_series:
      }
    end
  end
end
