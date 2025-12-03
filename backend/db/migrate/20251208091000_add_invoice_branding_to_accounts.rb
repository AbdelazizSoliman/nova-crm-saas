class AddInvoiceBrandingToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :invoice_template, :string, default: "template_a", null: false
    add_column :accounts, :brand_color, :string, default: "#2563eb", null: false
    add_column :accounts, :footer_text, :text
    add_column :accounts, :additional_note, :text
  end
end
