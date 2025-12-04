module Api
  class ImportsController < BaseController
    require "csv"

    before_action :authorize_manage_clients!, only: :clients
    before_action :authorize_manage_products!, only: :products

    def clients
      result = process_csv_import(expected_headers: %w[name email phone address company]) do |row, row_number|
        name = row["name"].to_s.strip
        email = row["email"].to_s.strip.downcase

        raise StandardError, "Name and email are required" if name.blank? || email.blank?

        client = current_account.clients.find_or_initialize_by(email: email)
        client.assign_attributes(
          name: name,
          phone: row["phone"].to_s.strip.presence,
          address: row["address"].to_s.strip.presence,
          contact_name: row["company"].to_s.strip.presence
        )

        client.save!
      rescue ActiveRecord::RecordInvalid => e
        raise StandardError, e.record.errors.full_messages.to_sentence
      end

      return if performed?

      render json: result
    end

    def products
      result = process_csv_import(expected_headers: %w[name sku price tax_rate description]) do |row, _row_number|
        name = row["name"].to_s.strip
        sku = row["sku"].to_s.strip
        price_value = row["price"].to_s.strip
        tax_value = row["tax_rate"].to_s.strip

        raise StandardError, "Name, SKU, and price are required" if name.blank? || sku.blank? || price_value.blank?

        unit_price = BigDecimal(price_value)
        tax_rate = tax_value.present? ? BigDecimal(tax_value) : nil

        if tax_rate && tax_rate.negative?
          raise StandardError, "Tax rate must be zero or positive"
        end

        product = current_account.products.find_or_initialize_by(sku: sku)
        product.assign_attributes(
          name: name,
          unit_price: unit_price,
          default_tax_rate: tax_rate,
          description: row["description"].to_s.strip.presence,
          currency: current_account.default_currency,
          product_type: product.product_type.presence || "product"
        )

        product.save!
      rescue ArgumentError
        raise StandardError, "Price and tax rate must be valid numbers"
      rescue ActiveRecord::RecordInvalid => e
        raise StandardError, e.record.errors.full_messages.to_sentence
      end

      return if performed?

      render json: result
    end

    private

    def process_csv_import(expected_headers: [])
      file = params[:file]

      if file.blank?
        return render json: { error: "CSV file is required" }, status: :unprocessable_entity
      end

      unless valid_csv_file?(file)
        return render json: { error: "Invalid file. Please upload a CSV file under 5MB." }, status: :unprocessable_entity
      end

      tempfile = Tempfile.new(["import", ".csv"])
      tempfile.binmode
      tempfile.write(file.read)
      tempfile.rewind

      csv_table = CSV.read(tempfile.path, headers: true, encoding: "bom|utf-8")
      headers = normalize_headers(csv_table.headers)

      missing_headers = expected_headers - headers
      if missing_headers.present?
        return render json: { error: "Missing required headers: #{missing_headers.join(', ')}" }, status: :unprocessable_entity
      end

      success = 0
      failed = 0
      errors = []

      csv_table.each_with_index do |row, idx|
        begin
          normalized_row = normalize_row(row)
          yield(normalized_row, idx + 2)
          success += 1
        rescue StandardError => e
          failed += 1
          errors << { row: idx + 2, message: e.message }
        end
      end

      { success:, failed:, errors: }
    rescue CSV::MalformedCSVError => e
      render json: { error: "Invalid CSV format: #{e.message}" }, status: :unprocessable_entity
    ensure
      tempfile.close! if tempfile
    end

    def normalize_headers(headers)
      headers.compact.map { |h| h.to_s.strip.downcase }
    end

    def normalize_row(row)
      row.to_h.transform_keys { |key| key.to_s.strip.downcase }
    end

    def valid_csv_file?(file)
      return false unless file.respond_to?(:original_filename) && file.respond_to?(:size)

      File.extname(file.original_filename).casecmp(".csv").zero? && file.size <= 5.megabytes
    end

    def authorize_manage_clients!
      render_forbidden unless Authorization.can_manage_clients?(current_user)
    end

    def authorize_manage_products!
      render_forbidden unless Authorization.can_manage_products?(current_user)
    end
  end
end
