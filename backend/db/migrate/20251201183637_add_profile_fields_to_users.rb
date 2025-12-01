class AddProfileFieldsToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :job_title, :string
    add_column :users, :phone, :string
    add_column :users, :avatar_url, :string
    add_column :users, :locale, :string
    add_column :users, :timezone, :string
  end
end