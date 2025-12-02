class CreateActivityLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :activity_logs do |t|
      t.references :account, null: false, foreign_key: true
      t.references :user, foreign_key: true
      t.string :action, null: false
      t.string :record_type
      t.bigint :record_id
      t.jsonb :metadata, null: false, default: {}
      t.string :ip
      t.string :user_agent

      t.timestamps
    end

    add_index :activity_logs, %i[account_id created_at]
    add_index :activity_logs, %i[record_type record_id]
  end
end
