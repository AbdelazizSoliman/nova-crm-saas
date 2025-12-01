class Payment < ApplicationRecord
  belongs_to :invoice

  delegate :client, :account, to: :invoice
end
