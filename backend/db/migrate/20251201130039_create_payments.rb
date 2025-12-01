class CreatePayments < ActiveRecord::Migration[7.1]
  def change
    create_table :payments do |t|
      t.references :invoice, null: false, foreign_key: true
      t.decimal :amount, precision: 10, scale: 2
      t.datetime :paid_at
      t.string :method
      t.text :note

      t.timestamps
    end
  end
end
