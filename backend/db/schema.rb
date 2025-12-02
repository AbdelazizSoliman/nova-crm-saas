# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_12_02_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "activity_logs", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.bigint "user_id"
    t.string "action", null: false
    t.string "record_type"
    t.bigint "record_id"
    t.jsonb "metadata", default: {}, null: false
    t.string "ip"
    t.string "user_agent"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id", "created_at"], name: "index_activity_logs_on_account_id_and_created_at"
    t.index ["record_type", "record_id"], name: "index_activity_logs_on_record_type_and_record_id"
    t.index ["user_id"], name: "index_activity_logs_on_user_id"
  end

  create_table "accounts", force: :cascade do |t|
    t.string "name"
    t.string "logo_url"
    t.string "default_currency", default: "USD", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "company_name"
    t.text "company_address"
    t.string "company_phone"
    t.string "company_website"
    t.string "company_tax_id"
    t.string "company_logo_url"
    t.string "invoice_prefix", default: "INV", null: false
    t.decimal "default_tax_rate", precision: 5, scale: 2, default: "0.0", null: false
    t.integer "default_payment_terms_days", default: 7, null: false
  end

  create_table "clients", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "name"
    t.string "contact_name"
    t.string "email"
    t.string "phone"
    t.string "address"
    t.string "country"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_clients_on_account_id"
  end

  create_table "invoice_items", force: :cascade do |t|
    t.bigint "invoice_id", null: false
    t.string "description"
    t.integer "quantity"
    t.decimal "unit_price", precision: 10, scale: 2
    t.decimal "tax_rate", precision: 10, scale: 2
    t.decimal "line_total", precision: 10, scale: 2
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["invoice_id"], name: "index_invoice_items_on_invoice_id"
  end

  create_table "invoices", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.bigint "client_id", null: false
    t.string "number"
    t.date "issue_date"
    t.date "due_date"
    t.string "currency"
    t.string "status"
    t.decimal "subtotal", precision: 10, scale: 2
    t.decimal "tax_total", precision: 10, scale: 2
    t.decimal "total", precision: 10, scale: 2
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_invoices_on_account_id"
    t.index ["client_id"], name: "index_invoices_on_client_id"
  end

  create_table "payments", force: :cascade do |t|
    t.bigint "invoice_id", null: false
    t.decimal "amount", precision: 10, scale: 2
    t.datetime "paid_at"
    t.string "method"
    t.text "note"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["invoice_id"], name: "index_payments_on_invoice_id"
  end

  create_table "users", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "first_name"
    t.string "last_name"
    t.string "email"
    t.string "role"
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "job_title"
    t.string "phone"
    t.string "avatar_url"
    t.string "locale"
    t.string "timezone"
    t.index ["account_id"], name: "index_users_on_account_id"
  end

  create_table "products", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "name", null: false
    t.string "sku"
    t.text "description"
    t.decimal "unit_price", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "default_tax_rate", precision: 5, scale: 2
    t.string "currency"
    t.boolean "is_active", default: true, null: false
    t.string "product_type"
    t.string "category"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id", "sku"], name: "index_products_on_account_id_and_sku", unique: true, where: "(sku IS NOT NULL)"
    t.index ["name"], name: "index_products_on_name"
  end

  add_foreign_key "activity_logs", "accounts"
  add_foreign_key "activity_logs", "users"
  add_foreign_key "clients", "accounts"
  add_foreign_key "invoice_items", "invoices"
  add_foreign_key "invoices", "accounts"
  add_foreign_key "invoices", "clients"
  add_foreign_key "payments", "invoices"
  add_foreign_key "users", "accounts"
  add_foreign_key "products", "accounts"
end
