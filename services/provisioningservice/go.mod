module github.com/MidasWR/ShareMTC/services/provisioningservice

go 1.25.0

require (
	github.com/MidasWR/ShareMTC/services/sdk v0.0.0
	github.com/go-chi/chi/v5 v5.2.1
	github.com/google/uuid v1.6.0
	github.com/jackc/pgx/v5 v5.7.2
)

replace github.com/MidasWR/ShareMTC/services/sdk => ../sdk
