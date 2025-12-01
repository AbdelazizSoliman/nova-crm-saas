require "prawn"

class InvoicePdfGenerator
  include ActiveSupport::NumberHelper

  def initialize(invoice)
    @invoice = invoice
    @account = invoice.account
    @client = invoice.client
  end

  def render
    Prawn::Document.new(page_size: "A4", margin: 36) do |pdf|
      build_header(pdf)
      pdf.move_down 20
      build_parties(pdf)
      pdf.move_down 20
      build_items(pdf)
      pdf.move_down 12
      build_totals(pdf)
      pdf.move_down 18
      build_payments(pdf)
      pdf.move_down 12
      build_notes(pdf)

      pdf.number_pages "Page <page> of <total>",
                      at: [pdf.bounds.right - 120, 0],
                      size: 9,
                      start_count_at: 1
    end.render
  end

  private

  attr_reader :invoice, :account, :client

  def build_header(pdf)
    company_lines = [
      account.company_name.presence || "Company",
      account.company_address,
      format_phone(account.company_phone),
      account.company_website,
      (account.company_tax_id.present? ? "Tax ID: #{account.company_tax_id}" : nil)
    ].compact

    right_block = [
      "Invoice",
      "Invoice ##{invoice.number}",
      "Status: #{human_status}",
      "Issued: #{format_date(invoice.issue_date)}",
      "Due: #{format_date(invoice.due_date)}"
    ].join("\n")

    pdf.table(
      [[company_lines.join("\n"), right_block]],
      cell_style: { borders: [], padding: [0, 0, 0, 0] },
      width: pdf.bounds.width
    ) do |t|
      t.columns(0).size = 11
      t.columns(1).align = :right
      t.columns(1).size = 11
      t.columns(1).font_style = :bold
    end
  end

  def build_parties(pdf)
    from_info = [
      account.company_name.presence || "Company",
      account.company_address,
      format_phone(account.company_phone),
      account.company_website
    ].compact.join("\n")

    bill_to_info = [
      client&.name,
      client&.contact_name,
      client&.email
    ].compact.join("\n")

    pdf.move_down 6
    pdf.table(
      [[
        pdf.make_cell("Bill From\n#{from_info}", inline_format: true, borders: [], padding: [6, 6, 6, 0]),
        pdf.make_cell("Bill To\n#{bill_to_info}", inline_format: true, borders: [], padding: [6, 0, 6, 6])
      ]],
      width: pdf.bounds.width
    ) do |t|
      t.cells.background_color = "f8fafc"
      t.columns(0).align = :left
      t.columns(1).align = :right
      t.cells.size = 10
      t.cells.valign = :top
      t.cells.font_style = :normal
      t.cells.inline_format = true
    end
  end

  def build_items(pdf)
    data = [["Item", "Qty", "Unit Price", "Tax %", "Line Total"]]

    if invoice.invoice_items.any?
      invoice.invoice_items.each do |item|
        data << [
          item.description,
          item.quantity,
          money(item.unit_price),
          item.tax_rate.to_f,
          money(item.line_total)
        ]
      end
    else
      data << ["No items", nil, nil, nil, nil]
    end

    pdf.table(
      data,
      header: true,
      width: pdf.bounds.width,
      column_widths: [pdf.bounds.width * 0.4, 60, 110, 70, 110],
      row_colors: %w[ffffff f7f9fb],
      cell_style: { borders: [:top, :bottom], border_width: 0.5, padding: [6, 8, 6, 8] }
    ) do |t|
      t.row(0).font_style = :bold
      t.row(0).background_color = "eef2f7"
      t.columns(1..4).align = :right
    end
  end

  def build_totals(pdf)
    payments_total = invoice.payments.sum(&:amount).to_d
    balance_due = (invoice.total || 0).to_d - payments_total

    pdf.bounding_box([pdf.bounds.right - 230, pdf.cursor], width: 230) do
      pdf.table(
        [
          ["Subtotal", money(invoice.subtotal)],
          ["Tax", money(invoice.tax_total)],
          ["Total", money(invoice.total)],
          ["Payments", money(payments_total)],
          ["Balance Due", money(balance_due)]
        ],
        column_widths: [110, 120],
        cell_style: { borders: [], padding: [4, 6, 4, 6], size: 10 }
      ) do |t|
        t.rows(2).font_style = :bold
        t.rows(4).font_style = :bold
      end
    end
  end

  def build_payments(pdf)
    pdf.text "Payments", size: 12, style: :bold
    pdf.move_down 6

    if invoice.payments.empty?
      pdf.text "No payments recorded.", size: 10, color: "555555"
      return
    end

    rows = [["Date", "Amount", "Method", "Note"]]
    invoice.payments.order(paid_at: :desc).each do |payment|
      rows << [
        format_datetime(payment.paid_at),
        money(payment.amount),
        payment.method.to_s.tr("_", " ").capitalize,
        payment.note.presence || "-"
      ]
    end

    pdf.table(
      rows,
      header: true,
      width: pdf.bounds.width,
      cell_style: { borders: [:top, :bottom], border_width: 0.4, padding: [5, 6, 5, 6], size: 10 }
    ) do |t|
      t.row(0).font_style = :bold
      t.row(0).background_color = "eef2f7"
      t.columns(1).align = :right
    end
  end

  def build_notes(pdf)
    pdf.text "Notes", size: 12, style: :bold
    pdf.move_down 4
    pdf.text(invoice.notes.presence || "No notes provided.", size: 10, color: "444444")
  end

  def human_status
    invoice.status.to_s.tr("_", " ").split.map(&:capitalize).join(" ")
  end

  def format_date(date)
    return "-" unless date

    date.strftime("%b %d, %Y")
  end

  def format_datetime(datetime)
    return "-" unless datetime

    datetime.strftime("%b %d, %Y %H:%M")
  end

  def money(amount)
    number_to_currency((amount || 0).to_d, unit: currency_code, format: "%u %n", precision: 2)
  end

  def currency_code
    invoice.currency.presence || account.default_currency || "USD"
  end

  def format_phone(phone)
    phone.presence
  end
end