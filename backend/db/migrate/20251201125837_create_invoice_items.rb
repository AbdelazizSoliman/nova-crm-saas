class CreateInvoiceItems < ActiveRecord::Migration[7.1]
  def change
    create_table :invoice_items do |t|
      t.references :invoice, null: false, foreign_key: true
      t.string :description
      t.integer :quantity
      t.decimal :unit_price, precision: 10, scale: 2
      t.decimal :tax_rate, precision: 10, scale: 2
      t.decimal :line_total, precision: 10, scale: 2

      t.timestamps
    end
  end
end
