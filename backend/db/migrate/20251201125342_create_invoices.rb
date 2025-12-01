class CreateInvoices < ActiveRecord::Migration[7.1]
  def change
    create_table :invoices do |t|
      t.references :account, null: false, foreign_key: true
      t.references :client, null: false, foreign_key: true
      t.string :number
      t.date :issue_date
      t.date :due_date
      t.string :currency
      t.string :status
      t.decimal :subtotal, precision: 10, scale: 2
      t.decimal :tax_total, precision: 10, scale: 2
      t.decimal :total, precision: 10, scale: 2

      t.text :notes

      t.timestamps
    end
  end
end
