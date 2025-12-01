class AddSettingsFieldsToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :company_name, :string
    add_column :accounts, :company_address, :text
    add_column :accounts, :company_phone, :string
    add_column :accounts, :company_website, :string
    add_column :accounts, :company_tax_id, :string
    add_column :accounts, :company_logo_url, :string

    add_column :accounts, :invoice_prefix, :string, default: "INV", null: false
    add_column :accounts, :default_tax_rate, :decimal, precision: 5, scale: 2, default: 0.0, null: false
    add_column :accounts, :default_payment_terms_days, :integer, default: 7, null: false

    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE accounts
          SET default_currency = 'USD'
          WHERE default_currency IS NULL OR default_currency = ''
        SQL
      end
    end

    change_column_default :accounts, :default_currency, from: nil, to: "USD"
    change_column_null :accounts, :default_currency, false, "USD"
  end
end