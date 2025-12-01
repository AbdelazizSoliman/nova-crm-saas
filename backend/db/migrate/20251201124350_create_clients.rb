class CreateClients < ActiveRecord::Migration[7.1]
  def change
    create_table :clients do |t|
      t.references :account, null: false, foreign_key: true
      t.string :name
      t.string :contact_name
      t.string :email
      t.string :phone
      t.string :address
      t.string :country
      t.text :notes

      t.timestamps
    end
  end
end
