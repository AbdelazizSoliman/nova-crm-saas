module Api
  class ExportsController < BaseController
    require "csv"
    require "zip"

    before_action :authorize_manage_clients!, only: :clients
    before_action :authorize_manage_products!, only: :products
    before_action :authorize_manage_invoices!, only: %i[invoices invoices_zip]

    def clients
      csv_data = CSV.generate(headers: true) do |csv|
        csv << %w[name email phone company address created_at]

        current_account.clients.find_each do |client|
          csv << [
            client.name,
            client.email,
            client.phone,
            client.contact_name,
            client.address,
            client.created_at&.iso8601
          ]
        end
      end

      send_data csv_data,
                type: "text/csv",
                filename: "clients_export_#{Date.current}.csv"
    end

    def products
      csv_data = CSV.generate(headers: true) do |csv|
        csv << %w[name sku price tax_rate created_at]

        current_account.products.find_each do |product|
          csv << [
            product.name,
            product.sku,
            product.unit_price,
            product.default_tax_rate,
            product.created_at&.iso8601
          ]
        end
      end

      send_data csv_data,
                type: "text/csv",
                filename: "products_export_#{Date.current}.csv"
    end

    def invoices
      csv_data = CSV.generate(headers: true) do |csv|
        csv << %w[invoice_number client_name issue_date due_date status subtotal tax_total total currency]

        current_account.invoices.includes(:client).find_each do |invoice|
          csv << [
            invoice.number,
            invoice.client&.name,
            invoice.issue_date,
            invoice.due_date,
            invoice.status,
            invoice.subtotal,
            invoice.tax_total,
            invoice.total,
            invoice.currency
          ]
        end
      end

      send_data csv_data,
                type: "text/csv",
                filename: "invoices_export_#{Date.current}.csv"
    end

    def invoices_zip
      invoices = current_account.invoices.includes(:client)

      zip_buffer = Zip::OutputStream.write_buffer do |zip|
        invoices.find_each do |invoice|
          pdf_data = InvoicePdfGenerator.new(invoice).render
          filename = invoice.number.presence || "invoice-#{invoice.id}"

          zip.put_next_entry("#{filename}.pdf")
          zip.write(pdf_data)
        rescue StandardError => e
          Rails.logger.error("Failed to add invoice #{invoice.id} to zip: #{e.message}")
        end
      end

      zip_buffer.rewind

      send_data zip_buffer.read,
                type: "application/zip",
                filename: "invoices_export_#{Date.current}.zip"
    end

    private

    def authorize_manage_clients!
      render_forbidden unless Authorization.can_manage_clients?(current_user)
    end

    def authorize_manage_products!
      render_forbidden unless Authorization.can_manage_products?(current_user)
    end

    def authorize_manage_invoices!
      render_forbidden unless Authorization.can_manage_invoices?(current_user)
    end
  end
end
