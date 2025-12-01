class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      t.references :account, null: false, foreign_key: true
      t.string :first_name
      t.string :last_name
      t.string :email
      t.string :role
      t.string :password_digest

      t.timestamps
    end
  end
end
