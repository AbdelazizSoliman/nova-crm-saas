class CreateNotifications < ActiveRecord::Migration[7.1]
  def change
    create_table :notifications do |t|
      t.references :account, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.text :body
      t.string :notifiable_type
      t.bigint :notifiable_id
      t.string :action, null: false
      t.boolean :read, default: false, null: false
      t.timestamps
    end

    add_index :notifications, :read
    add_index :notifications, %i[notifiable_type notifiable_id]
  end
end
