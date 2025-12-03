require "prawn"
require "prawn/table"

module InvoicePdf
  class ClassicTemplate
    include ActiveSupport::NumberHelper

    BORDER_COLOR = "374151".freeze
    HEADER_BACKGROUND = "F3F4F6".freeze
    HEADER_TEXT_COLOR = "0F172A".freeze
    LIGHT_BORDER_COLOR = "D1D5DB".freeze

    def initialize(invoice, account:, branding_settings: {})
      @invoice = invoice
      @account = account
      @client = invoice.client
      @branding_settings = branding_settings || {}
    end

    def render
      Prawn::Document.new(page_size: "A4", margin: 36) do |pdf|
        apply_footer(pdf)
        render_header(pdf)
        pdf.move_down 18

        render_parties(pdf)
        pdf.move_down 14

        render_items_table(pdf)
        pdf.move_down 14

        render_totals(pdf)
        render_notes(pdf)
        pdf.move_down 18

        render_signatures(pdf)

        pdf.number_pages "Page <page> of <total>",
                        at: [pdf.bounds.right - 120, 10],
                        size: 9,
                        start_count_at: 1,
                        color: "6b7280"
      end.render
    end

    private

    attr_reader :invoice, :account, :client, :branding_settings

    def render_header(pdf)
      pdf.bounding_box([pdf.bounds.left, pdf.cursor], width: pdf.bounds.width, height: 150) do
        pdf.fill_color HEADER_BACKGROUND
        pdf.fill_rectangle [bounds.left, bounds.top], bounds.width, bounds.height
        pdf.fill_color HEADER_TEXT_COLOR

        pdf.bounding_box([bounds.left + 14, bounds.top - 14], width: bounds.width - 28, height: bounds.height - 20) do
          pdf.stroke_color = BORDER_COLOR
          pdf.stroke_bounds
          pdf.stroke_color = "000000"

          pdf.table(
            [[header_left_block(pdf), header_right_block(pdf)]],
            column_widths: [bounds.width * 0.55, bounds.width * 0.45],
            cell_style: { borders: [], padding: [8, 10, 8, 10] }
          )
        end
      end
      pdf.move_down 6
      pdf.fill_color "000000"
    end

    def header_left_block(pdf)
      pdf.make_cell(borders: []) do
        draw_logo(pdf, width: 120, position: :center)
        pdf.move_down 6
        pdf.text(account.company_name.presence || "Company", size: 14, style: :bold, align: :center)
        pdf.text(account.company_address.to_s, size: 10, align: :center, leading: 2) if account.company_address.present?
      end
    end

    def header_right_block(pdf)
      pdf.make_cell(borders: []) do
        pdf.text "INVOICE", size: 28, style: :bold, align: :right, color: HEADER_TEXT_COLOR
        pdf.move_down 10
        pdf.text "Invoice No: #{invoice.number}", size: 11, style: :bold, align: :right
        pdf.text "Date: #{format_date(invoice.issue_date)}", size: 10, align: :right
        pdf.text "Due Date: #{format_date(invoice.due_date)}", size: 10, align: :right
      end
    end

    def render_parties(pdf)
      start_y = pdf.cursor
      table = pdf.make_table(
        [[bill_to_cell(pdf), company_cell(pdf)]],
        column_widths: [pdf.bounds.width / 2, pdf.bounds.width / 2],
        cell_style: { borders: [], padding: [8, 12, 12, 12] }
      )

      box_height = table.height + 12
      pdf.bounding_box([pdf.bounds.left, start_y], width: pdf.bounds.width, height: box_height) do
        pdf.move_down 6
        table.draw
      end

      pdf.stroke_color = BORDER_COLOR
      pdf.stroke_rectangle [pdf.bounds.left, start_y], pdf.bounds.width, box_height
      pdf.stroke_color = "000000"
    end

    def bill_to_cell(pdf)
      pdf.make_cell(borders: []) do
        pdf.text "Bill To", size: 12, style: :bold, color: HEADER_TEXT_COLOR
        pdf.move_down 4
        pdf.text safe_join([client&.name, client&.address, client&.email, client_tax_number].compact), size: 10, leading: 2
      end
    end

    def company_cell(pdf)
      pdf.make_cell(borders: []) do
        pdf.text "Company", size: 12, style: :bold, color: HEADER_TEXT_COLOR, align: :right
        pdf.move_down 4
        details = [
          account.company_name.presence || account.name,
          account.company_address,
          account.company_phone,
          account.company_website,
          company_tax_number
        ].compact
        pdf.text safe_join(details), size: 10, leading: 2, align: :right
      end
    end

    def render_items_table(pdf)
      pdf.text "Invoice Items", size: 12, style: :bold, color: HEADER_TEXT_COLOR
      pdf.move_down 6

      rows = [["#", "Description", "Qty", "Unit Price", "Tax %", "Tax Amount", "Line Total"]]
      if invoice.invoice_items.any?
        invoice.invoice_items.each_with_index do |item, idx|
          tax_rate_value = item.tax_rate.presence || invoice.tax_rate.presence || account.tax_rate
          tax_rate = tax_rate_value.to_d
          line_total = (item.line_total || 0).to_d
          tax_amount = (line_total * tax_rate / 100).round(2)

          rows << [
            idx + 1,
            item.description.presence || "Item",
            item.quantity,
            money(item.unit_price),
            format("%0.2f", tax_rate.to_f),
            money(tax_amount),
            money(line_total + tax_amount)
          ]
        end
      else
        rows << ["-", "No items added", nil, nil, nil, nil, nil]
      end

      pdf.table(
        rows,
        header: true,
        width: pdf.bounds.width,
        row_colors: %w[ffffff F9FAFB],
        cell_style: { size: 10, border_color: BORDER_COLOR, borders: [:left, :right, :top, :bottom], padding: [6, 8, 6, 8] }
      ) do |t|
        t.row(0).background_color = "E5E7EB"
        t.row(0).font_style = :bold
        t.row(0).text_color = HEADER_TEXT_COLOR
        t.columns(0).align = :center
        t.columns(2..6).align = :right
      end
    end

    def render_totals(pdf)
      pdf.move_down 6
      box_width = 280
      start_y = pdf.cursor

      grand_total = (invoice.total || 0).to_d - discount_amount
      payments_total = invoice.payments.sum(&:amount).to_d
      balance_due = grand_total - payments_total

      totals_rows = [
        ["Subtotal", money(invoice.subtotal)],
        [tax_label, money(invoice.tax_total)],
        ["Discount", money(discount_amount)],
        [
          { content: "Grand Total", font_style: :bold },
           { content: money(grand_total), font_style: :bold }
        ],
        ["Payments", money(payments_total)],
        [
          { content: "Balance Due", font_style: :bold },
          { content: money(balance_due), font_style: :bold }
        ]
      ]

      totals_table = pdf.make_table(
        totals_rows,
        width: box_width - 16,
        position: :center,
        cell_style: { borders: [], padding: [6, 4, 6, 4], size: 10 }
      )

      totals_table.columns(0).text_color = HEADER_TEXT_COLOR
      totals_table.columns(1).align = :right
      totals_table.cells.filter { |c| c.font_style == :bold }.each { |cell| cell.size = 12 }

      words_height = if amount_in_words.present?
        pdf.height_of("Amount in words: #{amount_in_words}", width: box_width - 16, size: 9) + 18
      else
        0
      end

      box_height = totals_table.height + words_height + 16
      pdf.bounding_box([pdf.bounds.right - box_width, start_y], width: box_width, height: box_height) do
        pdf.move_down 8
        totals_table.draw

        if amount_in_words.present?
          pdf.move_down 6
          pdf.stroke_color = LIGHT_BORDER_COLOR
          pdf.stroke_horizontal_rule
          pdf.move_down 6
          pdf.text "Amount in words: #{amount_in_words}", size: 9, color: "111827"
          pdf.stroke_color = "000000"
        end
      end

      pdf.stroke_color = BORDER_COLOR
      pdf.stroke_rectangle [pdf.bounds.right - box_width, start_y], box_width, box_height
      pdf.stroke_color = "000000"
    end

    def render_notes(pdf)
      note_content = [invoice.notes.presence, branding_settings[:additional_note].presence].compact.join("\n\n")
      return if note_content.blank?

      pdf.move_down 12
      pdf.text "Notes", size: 12, style: :bold, color: HEADER_TEXT_COLOR
      pdf.move_down 4
      start_y = pdf.cursor
      box_height = pdf.height_of(note_content, width: pdf.bounds.width - 16, size: 9) + 16

      pdf.bounding_box([pdf.bounds.left, start_y], width: pdf.bounds.width, height: box_height) do
        pdf.pad(8) { pdf.text note_content, size: 9, color: "374151" }
      end

      pdf.stroke_color = LIGHT_BORDER_COLOR
      pdf.stroke_rectangle [pdf.bounds.left, start_y], pdf.bounds.width, box_height
      pdf.stroke_color = "000000"
    end

    def render_signatures(pdf)
      pdf.move_down 12
      pdf.stroke_color = LIGHT_BORDER_COLOR
      pdf.table(
        [[signature_block("Client Signature"), signature_block("Authorized Signature")]],
        width: pdf.bounds.width,
        cell_style: { borders: [], padding: [8, 12, 8, 12] }
      )
      pdf.stroke_color = "000000"
    end

    def signature_block(title)
      Prawn::Table::Cell.make(
        content: "#{title}\n\n______________________",
        borders: [],
        size: 10,
        text_color: HEADER_TEXT_COLOR
      )
    end

    def apply_footer(pdf)
      footer_content = branding_settings[:footer_text].presence || "Thank you for your business."
      pdf.repeat(:all) do
        pdf.bounding_box([pdf.bounds.left, pdf.bounds.bottom + 40], width: pdf.bounds.width) do
          pdf.stroke_color = LIGHT_BORDER_COLOR
          pdf.stroke_horizontal_rule
          pdf.move_down 6
          pdf.text footer_content, size: 9, color: "6b7280", align: :center
          pdf.stroke_color = "000000"
        end
      end
    end

    def tax_label
      name = invoice.tax_name.presence || account.tax_name.presence || "Tax"
      rate = invoice.tax_rate.present? ? invoice.tax_rate.to_f : account.tax_rate.to_f
      "#{name} (#{format('%.2f', rate)}%)"
    end

    def discount_amount
      return 0.to_d unless invoice.respond_to?(:discount_total)

      (invoice.discount_total || 0).to_d
    end

    def amount_in_words
      amount = (invoice.total || 0).to_d
      return if amount.zero?

      integer_part = amount.to_i
      cents = ((amount - integer_part) * 100).round
      words = number_to_words(integer_part)
      words << " and #{number_to_words(cents)} cents" if cents.positive?
      words << " #{currency_code}"
      words[0] = words[0].upcase
      words
    end

    def number_to_words(number)
      return "zero" if number.zero?

      ones = %w[zero one two three four five six seven eight nine]
      teens = %w[ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen]
      tens = [nil, nil, "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

      parts = []
      [[1_000_000_000, "billion"], [1_000_000, "million"], [1_000, "thousand"], [100, "hundred"]].each do |value, label|
        if number >= value
          parts << "#{number_to_words(number / value)} #{label}"
          number %= value
        end
      end

      if number >= 20
        parts << tens[number / 10]
        number %= 10
      elsif number >= 10
        parts << teens[number - 10]
        number = 0
      end

      parts << ones[number] if number.positive?
      parts.join(" ")
    end

    def money(amount)
      number_to_currency((amount || 0).to_d, unit: currency_code, format: "%u %n", precision: 2)
    end

    def currency_code
      invoice.currency.presence || account.default_currency || "USD"
    end

    def format_date(date)
      return "-" unless date

      date.strftime("%b %d, %Y")
    end

    def company_tax_number
      return unless account.company_tax_id.present?

      "VAT/Registration No: #{account.company_tax_id}"
    end

    def client_tax_number
      return unless client.respond_to?(:tax_id) && client.tax_id.present?

      "VAT/Tax Number: #{client.tax_id}"
    end

    def safe_join(lines)
      lines.join("\n")
    end

    def draw_logo(pdf, width: 120, position: :left)
      return unless (data = logo_io)

      pdf.image StringIO.new(data), width: width, position: position
    end

    def logo_io
      logo = branding_settings[:logo]
      return unless logo.respond_to?(:attached?) && logo.attached?

      if logo.variable?
        logo.variant(resize_to_limit: [240, 120]).processed.download
      else
        logo.download
      end
    rescue StandardError => e
      Rails.logger.warn("Invoice logo render failed: #{e.message}")
      nil
    end
  end
end
