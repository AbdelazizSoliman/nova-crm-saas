class CreateProducts < ActiveRecord::Migration[7.1]
  def change
    create_table :products do |t|
      t.references :account, null: false, foreign_key: true
      t.string :name, null: false
      t.string :sku
      t.text :description
      t.decimal :unit_price, precision: 12, scale: 2, null: false, default: 0
      t.decimal :default_tax_rate, precision: 5, scale: 2
      t.string :currency
      t.boolean :is_active, null: false, default: true
      t.string :product_type
      t.string :category

      t.timestamps
    end

    add_index :products, [:account_id, :sku], unique: true, where: "sku IS NOT NULL"
    add_index :products, :name
  end
end
