class AddTaxSettingsToAccountsAndInvoices < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :tax_name, :string, default: "VAT"
    add_column :accounts, :tax_inclusive, :boolean, default: false, null: false

    add_column :invoices, :tax_rate, :decimal, precision: 5, scale: 2, default: 0, null: false
    add_column :invoices, :tax_name, :string, default: "VAT"
    change_column_default :invoices, :currency, from: nil, to: "USD"
  end
end
