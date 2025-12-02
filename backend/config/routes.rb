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

    get "settings", to: "settings#show"
    put "settings/profile", to: "settings#update_profile"
    put "settings/account", to: "settings#update_account"

    resources :activity_logs, only: %i[index]

    resources :products do
      collection do
        get :autocomplete
      end
    end

    resources :clients

    resources :payments, only: %i[index destroy]
    
    resources :invoices do
      member do
        post :duplicate
        post :send_email
        get :pdf
      end

      resources :payments, only: %i[index create]
    end
  end
end
