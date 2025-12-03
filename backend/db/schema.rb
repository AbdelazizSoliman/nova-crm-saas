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

ActiveRecord::Schema[7.1].define(version: 2025_12_05_120000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

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
    t.string "tax_name", default: "VAT"
    t.boolean "tax_inclusive", default: false, null: false
    t.string "invoice_template", default: "template_a", null: false
    t.string "brand_color", default: "#2563eb", null: false
    t.text "footer_text"
    t.text "additional_note"
  end

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
    t.index ["account_id"], name: "index_activity_logs_on_account_id"
    t.index ["record_type", "record_id"], name: "index_activity_logs_on_record_type_and_record_id"
    t.index ["user_id"], name: "index_activity_logs_on_user_id"
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
    t.string "currency", default: "USD"
    t.string "status"
    t.decimal "subtotal", precision: 10, scale: 2
    t.decimal "tax_total", precision: 10, scale: 2
    t.decimal "total", precision: 10, scale: 2
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "tax_rate", precision: 5, scale: 2, default: "0.0", null: false
    t.string "tax_name", default: "VAT"
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

  create_table "plans", force: :cascade do |t|
    t.string "name", null: false
    t.string "code", null: false
    t.decimal "price", precision: 10, scale: 2, default: "0.0", null: false
    t.string "currency", default: "USD", null: false
    t.string "interval", default: "month", null: false
    t.integer "max_users"
    t.integer "max_clients"
    t.integer "max_invoices_per_month"
    t.integer "max_storage_mb"
    t.text "description"
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_plans_on_code", unique: true
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

  create_table "subscriptions", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.bigint "plan_id", null: false
    t.string "status", default: "active", null: false
    t.datetime "current_period_start"
    t.datetime "current_period_end"
    t.boolean "cancel_at_period_end", default: false, null: false
    t.datetime "trial_ends_at"
    t.string "external_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id", "status"], name: "index_subscriptions_on_account_id_and_status"
    t.index ["plan_id"], name: "index_subscriptions_on_plan_id"
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

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  add_foreign_key "activity_logs", "accounts"
  add_foreign_key "activity_logs", "users"
  add_foreign_key "clients", "accounts"
  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "invoice_items", "invoices"
  add_foreign_key "invoices", "accounts"
  add_foreign_key "invoices", "clients"
  add_foreign_key "payments", "invoices"
  add_foreign_key "users", "accounts"
  add_foreign_key "subscriptions", "accounts"
  add_foreign_key "subscriptions", "plans"
  add_foreign_key "products", "accounts"
  add_foreign_key "users", "accounts"
end
