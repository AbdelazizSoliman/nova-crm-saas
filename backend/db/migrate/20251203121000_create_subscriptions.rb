class CreateSubscriptions < ActiveRecord::Migration[7.1]
  def change
    create_table :subscriptions do |t|
      t.references :account, null: false, foreign_key: true
      t.references :plan, null: false, foreign_key: true
      t.string :status, null: false, default: "active"
      t.datetime :current_period_start
      t.datetime :current_period_end
      t.boolean :cancel_at_period_end, null: false, default: false
      t.datetime :trial_ends_at
      t.string :external_id

      t.timestamps
    end

    add_index :subscriptions, [:account_id, :status]
  end
end
