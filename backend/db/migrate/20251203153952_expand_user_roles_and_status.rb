class ExpandUserRolesAndStatus < ActiveRecord::Migration[7.1]
  def up
    add_column :users, :status, :string, default: "active", null: false

    # Update legacy roles
    execute <<~SQL
      UPDATE users
      SET role = 'admin'
      WHERE role = 'staff'
        OR role IS NULL;
    SQL
  end

  def down
    remove_column :users, :status

    execute <<~SQL
      UPDATE users
      SET role = 'staff'
      WHERE role = 'admin';
    SQL
  end
end
