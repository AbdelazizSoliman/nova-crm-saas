class Client < ApplicationRecord
  belongs_to :account
  has_many :invoices, dependent: :nullify
  has_many_attached :attachments

  validate :validate_attachments

  validates :name, presence: true

  private

  def validate_attachments
    attachments.each do |attachment|
      validate_attachment_blob(attachment.blob)
    end
  end

  def validate_attachment_blob(blob)
    return unless blob

    allowed_types = %w[application/pdf application/vnd.openxmlformats-officedocument.wordprocessingml.document application/vnd.openxmlformats-officedocument.spreadsheetml.sheet image/png image/jpeg image/jpg]
    unless blob.content_type.in?(allowed_types)
      errors.add(:attachments, "must be a PDF, DOCX, XLSX, PNG, or JPG file")
    end
  end
end
