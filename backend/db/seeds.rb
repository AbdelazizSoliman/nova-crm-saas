Subscription.destroy_all
Plan.destroy_all
Account.destroy_all
User.destroy_all
Client.destroy_all
Invoice.destroy_all
InvoiceItem.destroy_all
Payment.destroy_all

plans = Plan.create!([
  {
    name: "Free",
    code: "free",
    price: 0,
    currency: "USD",
    interval: "month",
    description: "Perfect to explore the product.",
  },
  {
    name: "Starter",
    code: "starter",
    price: 19,
    currency: "USD",
    interval: "month",
    description: "For growing teams that need more."
  },
  {
    name: "Pro",
    code: "pro",
    price: 39,
    currency: "USD",
    interval: "month",
    description: "Advanced features and limits for scaling."
  }
])

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

account.subscriptions.create!(
  plan: plans.second,
  status: "active",
  current_period_start: Time.current,
  current_period_end: 1.month.from_now
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
