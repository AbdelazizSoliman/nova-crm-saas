class CreatePlans < ActiveRecord::Migration[7.1]
  def change
    create_table :plans do |t|
      t.string :name, null: false
      t.string :code, null: false
      t.decimal :price, precision: 10, scale: 2, null: false, default: 0
      t.string :currency, null: false, default: "USD"
      t.string :interval, null: false, default: "month"
      t.integer :max_users
      t.integer :max_clients
      t.integer :max_invoices_per_month
      t.integer :max_storage_mb
      t.text :description
      t.boolean :is_active, null: false, default: true

      t.timestamps
    end

    add_index :plans, :code, unique: true
  end
end
