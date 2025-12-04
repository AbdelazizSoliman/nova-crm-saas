Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
  namespace :api do
    post "auth/register", to: "auth#register"
    post "auth/login",    to: "auth#login"

    get "dashboard/summary", to: "dashboard#summary"

    namespace :import do
      post :clients,  to: "imports#clients"
      post :products, to: "imports#products"
    end

    namespace :export do
      get "clients",  to: "exports#clients",  defaults: { format: :csv }
      get "products", to: "exports#products", defaults: { format: :csv }
      get "invoices", to: "exports#invoices", defaults: { format: :csv }
      get "invoices_zip", to: "exports#invoices_zip"
    end

    get "settings", to: "settings#show"
    put "settings/profile", to: "settings#update_profile"
    put "settings/account", to: "settings#update_account"
    get "settings/invoice", to: "settings#invoice_branding"
    patch "settings/invoice", to: "settings#update_invoice_branding"

    resources :activity_logs, only: %i[index]

    resources :products do
      collection do
        get :autocomplete
      end
    end

    resources :clients

    resources :payments, only: %i[index destroy]

    resources :invoices do
      collection do
        post :preview_pdf
      end

      member do
        post :duplicate
        post :send_email
        get :pdf
      end

      resources :payments, only: %i[index create]
    end

    resources :plans, only: %i[index]
    resource :subscription, only: %i[show create update]

    resources :notifications, only: %i[index] do
      collection do
        get :unread_count
        patch :mark_all_read
      end

      member do
        patch :mark_read
      end
    end

    get "team", to: "team#index"
    post "team/invite", to: "team#invite"
    patch "team/:id", to: "team#update"
    delete "team/:id", to: "team#destroy"
  end
end
