require "prawn"
require "prawn/table"

class InvoicePdfGenerator
  include ActiveSupport::NumberHelper

  TEMPLATE_METHODS = {
    "template_a" => :render_template_a,
    "template_b" => :render_template_b,
    "template_c" => :render_template_c
  }.freeze
  DEFAULT_BRAND_COLOR = "#2563eb".freeze

  def initialize(invoice, template: nil, branding: {})
    @invoice = invoice
    @account = invoice.account
    @client = invoice.client
    @template = normalize_template(template || branding[:template])
    @branding_overrides = branding || {}
  end

  def render
    Prawn::Document.new(page_size: "A4", margin: 36) do |pdf|
      apply_footer(pdf)
      send(TEMPLATE_METHODS[template], pdf)

      pdf.number_pages "Page <page> of <total>",
                      at: [pdf.bounds.right - 120, 0],
                      size: 9,
                      start_count_at: 1
    end.render
  end

  private

  attr_reader :invoice, :account, :client

  def template
    @template ||= normalize_template(nil)
  end

  def normalize_template(candidate)
    chosen = candidate.presence || account.invoice_template_key
    return chosen if Account::INVOICE_TEMPLATES.include?(chosen)

    "template_a"
  end

  def branding
    @branding ||= begin
      overrides = @branding_overrides.respond_to?(:symbolize_keys) ? @branding_overrides.symbolize_keys : {}
      base = account.invoice_branding

      {
        template: normalize_template(overrides[:template] || base[:template]),
        brand_color: normalize_color(overrides[:brand_color] || base[:brand_color] || DEFAULT_BRAND_COLOR),
        footer_text: overrides.key?(:footer_text) ? overrides[:footer_text] : base[:footer_text],
        additional_note: overrides.key?(:additional_note) ? overrides[:additional_note] : base[:additional_note],
        logo: base[:logo]
      }
    end
  end

  def brand_color
    branding[:brand_color]
  end

  def soft_brand_color
    lighten_hex(brand_color, 0.2)
  end

  def normalize_color(color)
    normalized = (color.presence || DEFAULT_BRAND_COLOR).dup
    normalized.prepend("#") unless normalized.start_with?("#")
    normalized.downcase
  end

  def apply_footer(pdf)
    return if branding[:footer_text].blank?

    pdf.repeat(:all) do
      pdf.bounding_box([pdf.bounds.left, pdf.bounds.bottom + 40], width: pdf.bounds.width) do
        pdf.stroke_color = "e2e8f0"
        pdf.stroke_horizontal_rule
        pdf.move_down 4
        pdf.text branding[:footer_text].to_s, size: 9, color: "555555", align: :center
        pdf.stroke_color = "000000"
      end
    end
  end

  def render_template_a(pdf)
    pdf.table(
      [[header_left_cell(pdf), header_right_cell]],
      width: pdf.bounds.width,
      cell_style: { borders: [], padding: [0, 0, 0, 0] }
    )

    pdf.stroke_color = brand_color
    pdf.stroke_horizontal_rule
    pdf.stroke_color = "000000"
    pdf.move_down 18

    build_parties(pdf, shaded: true)
    pdf.move_down 16
    build_items(pdf, header_background: soft_brand_color, header_text_color: "111827")
    pdf.move_down 12
    build_totals(pdf, accent_color: brand_color)
    pdf.move_down 10
    build_payments(pdf)
    pdf.move_down 10
    build_notes(pdf, header_color: brand_color)
  end

  def render_template_b(pdf)
    sidebar_width = 170
    pdf.canvas do
      pdf.fill_color brand_color
      pdf.fill_rectangle [pdf.bounds.left, pdf.bounds.top], sidebar_width, pdf.bounds.top
      pdf.fill_color "000000"
    end

    pdf.bounding_box([pdf.bounds.left + 12, pdf.bounds.top - 16], width: sidebar_width - 24) do
      pdf.fill_color "ffffff"
      draw_logo(pdf, width: sidebar_width - 40)
      pdf.move_down 10
      pdf.text account.company_name.presence || "Company", size: 12, style: :bold
      pdf.text account.company_address.to_s, size: 9, leading: 2 if account.company_address.present?
      pdf.move_down 12
      pdf.text "Invoice", size: 18, style: :bold
      pdf.text "##{invoice.number}", size: 12, color: "e2e8f0"
      pdf.move_down 8
      pdf.text "Total", size: 10, color: "e2e8f0"
      pdf.text money(invoice.total), size: 14, style: :bold
      pdf.move_down 6
      pdf.text "Due #{format_date(invoice.due_date)}", size: 9, color: "f8fafc"
      pdf.fill_color "000000"
    end

    pdf.bounding_box([sidebar_width + 16, pdf.bounds.top], width: pdf.bounds.width - sidebar_width - 16) do
      build_parties(pdf, label_color: brand_color)
      pdf.move_down 12
      build_dates_and_status(pdf)
      pdf.move_down 12
      build_items(pdf, header_background: soft_brand_color, header_text_color: "0f172a", border_color: "e2e8f0")
      pdf.move_down 12
      build_totals(pdf, accent_color: brand_color)
      pdf.move_down 10
      build_notes(pdf, header_color: brand_color)
      pdf.move_down 10
      build_payments(pdf)
    end
  end

  def render_template_c(pdf)
    pdf.table(
      [[header_left_cell(pdf), classic_header_block]],
      width: pdf.bounds.width,
      column_widths: [pdf.bounds.width * 0.55, pdf.bounds.width * 0.45],
      cell_style: { borders: [], padding: [0, 0, 0, 0] }
    ) do |t|
      t.columns(1).align = :right
    end
    pdf.move_down 10

    build_parties(pdf, shaded: false, border_color: "d9e2ec", label_color: "0f172a")
    pdf.move_down 12
    build_items(pdf, header_background: "f8fafc", header_text_color: "0f172a", border_color: "d9e2ec", zebra: true)
    pdf.move_down 10
    build_totals(pdf, accent_color: brand_color, border_color: "d9e2ec", align_right: true)
    pdf.move_down 10
    build_payments(pdf, subtle: true)
    pdf.move_down 8
    build_notes(pdf)
  end

  def header_left_cell(pdf)
    pdf.make_cell(align: :left, borders: []) do
      draw_logo(pdf)
      pdf.move_down 6
      pdf.text company_lines.join("\n"), size: 10, leading: 2
    end
  end

  def header_right_cell
    summary = [
      "Invoice ##{invoice.number}",
      "Status: #{human_status}",
      "Issued: #{format_date(invoice.issue_date)}",
      "Due: #{format_date(invoice.due_date)}",
      "Balance Due: #{money(balance_due)}"
    ].join("\n")

    Prawn::Table::Cell.make(
      content: summary,
      inline_format: true,
      align: :right,
      borders: [],
      padding: [2, 0, 0, 0],
      text_color: "0f172a",
      size: 11,
      font_style: :bold
    )
  end

  def classic_header_block
    Prawn::Table::Cell.make(
      content: "Total\n#{money(invoice.total)}\nDue #{format_date(invoice.due_date)}",
      borders: [],
      align: :right,
      size: 11,
      font_style: :bold,
      padding: [0, 0, 0, 0]
    )
  end

  def build_parties(pdf, shaded: false, border_color: "e2e8f0", label_color: "475569")
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

    cells = [
      pdf.make_cell("Bill From\n#{from_info}", inline_format: true, borders: [], padding: [8, 8, 8, 0], background_color: (shaded ? "f8fafc" : nil)),
      pdf.make_cell("Bill To\n#{bill_to_info}", inline_format: true, borders: [], padding: [8, 0, 8, 8], background_color: (shaded ? "f8fafc" : nil), align: :right)
    ]

    pdf.table([cells], width: pdf.bounds.width, cell_style: { border_color: border_color }) do |t|
      t.cells.size = 10
      t.cells.valign = :top
      t.cells.inline_format = true
      t.cells.text_color = label_color
    end
  end

  def build_dates_and_status(pdf)
    data = [
      ["Issue Date", format_date(invoice.issue_date)],
      ["Due Date", format_date(invoice.due_date)],
      ["Status", human_status],
      ["Currency", currency_code]
    ]

    pdf.table(data, header: false, cell_style: { borders: [], padding: [3, 4, 3, 0], size: 9, text_color: "334155" }) do |t|
      t.columns(0).font_style = :bold
      t.columns(0).text_color = brand_color
      t.columns(1).align = :right
    end
  end

  def build_items(pdf, header_background:, header_text_color:, border_color: "e2e8f0", zebra: false)
    data = [["Item", "Qty", "Unit Price", tax_label, "Line Total"]]

    if invoice.invoice_items.any?
      invoice.invoice_items.each do |item|
        data << [
          item.description,
          item.quantity,
          money(item.unit_price),
          invoice.tax_rate.to_f,
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
      row_colors: zebra ? %w[ffffff f8fafc] : nil,
      cell_style: { borders: [:top, :bottom], border_width: 0.5, border_color: border_color, padding: [6, 8, 6, 8], size: 10 }
    ) do |t|
      t.row(0).font_style = :bold
      t.row(0).background_color = header_background
      t.row(0).text_color = header_text_color
      t.columns(1..4).align = :right
    end
  end

  def build_totals(pdf, accent_color:, border_color: "e2e8f0", align_right: false)
    payments_total = invoice.payments.sum(&:amount).to_d
    data = [
      ["Subtotal", money(invoice.subtotal)],
      [tax_label, money(invoice.tax_total)],
      ["Total", money(invoice.total)],
      ["Payments", money(payments_total)],
      ["Balance Due", money(balance_due)]
    ]

    box_options = align_right ? [pdf.bounds.right - 250, pdf.cursor] : [pdf.bounds.left, pdf.cursor]
    pdf.bounding_box(box_options, width: 250) do
      pdf.table(
        data,
        column_widths: [120, 130],
        cell_style: { borders: [], padding: [5, 6, 5, 6], size: 10, border_color: border_color }
      ) do |t|
        t.rows(2).font_style = :bold
        t.rows(4).font_style = :bold
        t.columns(0).text_color = accent_color
        t.columns(1).align = :right
      end
    end
  end

  def build_payments(pdf, subtle: false)
    pdf.text "Payments", size: 12, style: :bold, color: subtle ? "0f172a" : brand_color
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
      cell_style: { borders: [:top, :bottom], border_width: 0.4, border_color: "e5e7eb", padding: [5, 6, 5, 6], size: 10 }
    ) do |t|
      t.row(0).font_style = :bold
      t.row(0).background_color = soft_brand_color
      t.columns(1).align = :right
    end
  end

  def build_notes(pdf, header_color: "0f172a")
    pdf.text "Notes", size: 12, style: :bold, color: header_color
    pdf.move_down 4
    pdf.text(combined_notes, size: 10, color: "444444")
  end

  def draw_logo(pdf, width: 120)
    return unless (data = logo_io)

    pdf.image StringIO.new(data), width: width
  end

  def logo_io
    logo = branding[:logo]
    return unless logo.respond_to?(:attached?) && logo.attached?

    blob_data =
      if logo.variable?
        logo.variant(resize_to_limit: [240, 120]).processed.download
      else
        logo.download
      end

    blob_data
  rescue StandardError => e
    Rails.logger.warn("Invoice logo render failed: #{e.message}")
    nil
  end

  def company_lines
    [
      account.company_name.presence || "Company",
      account.company_address,
      format_phone(account.company_phone),
      account.company_website,
      (account.company_tax_id.present? ? "Tax ID: #{account.company_tax_id}" : nil)
    ].compact
  end

  def combined_notes
    base_notes = invoice.notes.presence
    extra = branding[:additional_note].presence
    [base_notes, extra].compact.join("\n\n").presence || "No notes provided."
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

  def tax_label
    name = invoice.tax_name.presence || account.tax_name.presence || "Tax"
    rate = invoice.tax_rate.present? ? invoice.tax_rate.to_f : account.tax_rate.to_f
    "#{name} (#{format('%.2f', rate)}%)"
  end

  def format_phone(phone)
    phone.presence
  end

  def balance_due
    payments_total = invoice.payments.sum(&:amount).to_d
    (invoice.total || 0).to_d - payments_total
  end

  def lighten_hex(hex, factor)
    values = hex.delete("#").scan(/../).map { |c| c.to_i(16) }
    lightened = values.map { |v| (v + (255 - v) * factor).round }
    "#%02x%02x%02x" % lightened
  rescue StandardError
    DEFAULT_BRAND_COLOR
  end
end
