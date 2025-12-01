class CreateAccounts < ActiveRecord::Migration[7.1]
  def change
    create_table :accounts do |t|
      t.string :name
      t.string :logo_url
      t.string :default_currency

      t.timestamps
    end
  end
end
