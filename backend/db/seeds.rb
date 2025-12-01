Account.destroy_all
User.destroy_all
Client.destroy_all
Invoice.destroy_all
InvoiceItem.destroy_all
Payment.destroy_all

account = Account.create!(
  name: "Demo Company",
  default_currency: "USD"
)

owner = account.users.create!(
  first_name: "Demo",
  last_name: "Owner",
  email: "demo@example.com",
  role: "owner",
  password: "password",
  password_confirmation: "password"
)

3.times do |i|
  account.clients.create!(
    name: "Client ##{i + 1}",
    contact_name: "Person #{i + 1}",
    email: "client#{i + 1}@example.com",
    phone: "123456789",
    address: "Somewhere Street #{i + 1}",
    country: "US",
    notes: "Important client"
  )
end

puts "Seed done. Login with: demo@example.com / password"
