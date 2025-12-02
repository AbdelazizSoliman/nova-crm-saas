class InvoiceMailer < ApplicationMailer
  def send_invoice(invoice, recipient:, subject:, message:)
    @invoice = invoice
    @client = invoice.client
    @account = invoice.account
    @message_body = message

    attachments["#{invoice.number}.pdf"] = InvoicePdfGenerator.new(invoice).render

    mail(
      to: recipient,
      subject: subject,
      from: from_address
    )
  end

  private

  def from_address
    sender_email = ENV.fetch("MAILER_SENDER_EMAIL", "no-reply@example.com")

    return sender_email unless @account&.company_name.present?

    "#{@account.company_name} <#{sender_email}>"
  end
end
