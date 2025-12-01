class Client < ApplicationRecord
  belongs_to :account
  has_many :invoices, dependent: :nullify

  validates :name, presence: true
end
