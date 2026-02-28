package storage

import (
	"context"
	"encoding/json"
	"time"

	"github.com/MidasWR/ShareMTC/services/provisioningservice/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo {
	return &Repo{db: db}
}

func (r *Repo) Migrate(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS provisioning_jobs (
			id TEXT PRIMARY KEY,
			request_id TEXT NOT NULL UNIQUE,
			trace_id TEXT NOT NULL DEFAULT '',
			action TEXT NOT NULL,
			resource_type TEXT NOT NULL,
			provider TEXT NOT NULL,
			status TEXT NOT NULL,
			external_id TEXT NOT NULL DEFAULT '',
			error TEXT NOT NULL DEFAULT '',
			response_json TEXT NOT NULL DEFAULT '{}',
			attempts INTEGER NOT NULL DEFAULT 0,
			next_retry_at TIMESTAMPTZ,
			expires_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS external_resources (
			id TEXT PRIMARY KEY,
			provider TEXT NOT NULL,
			resource_type TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			internal_id TEXT NOT NULL DEFAULT '',
			external_id TEXT NOT NULL,
			status TEXT NOT NULL,
			public_ip TEXT NOT NULL DEFAULT '',
			expires_at TIMESTAMPTZ NOT NULL,
			deleted_at TIMESTAMPTZ,
			last_error TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_external_resources_exp ON external_resources(status, expires_at);
		CREATE INDEX IF NOT EXISTS idx_external_resources_ext ON external_resources(external_id, provider, resource_type);
	`)
	return err
}

func (r *Repo) GetJobByRequestID(ctx context.Context, requestID string) (models.Job, error) {
	var item models.Job
	err := r.db.QueryRow(ctx, `
		SELECT id, request_id, trace_id, action, resource_type, provider, status, external_id, error, response_json,
		       attempts, COALESCE(next_retry_at, 'epoch'::timestamptz), COALESCE(expires_at, 'epoch'::timestamptz), created_at, updated_at
		FROM provisioning_jobs
		WHERE request_id = $1
	`, requestID).Scan(
		&item.ID, &item.RequestID, &item.TraceID, &item.Action, &item.ResourceType, &item.Provider, &item.Status, &item.ExternalID, &item.Error,
		&item.ResponseJSON, &item.Attempts, &item.NextRetryAt, &item.ExpiresAt, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, err
}

func (r *Repo) GetJobByID(ctx context.Context, jobID string) (models.Job, error) {
	var item models.Job
	err := r.db.QueryRow(ctx, `
		SELECT id, request_id, trace_id, action, resource_type, provider, status, external_id, error, response_json,
		       attempts, COALESCE(next_retry_at, 'epoch'::timestamptz), COALESCE(expires_at, 'epoch'::timestamptz), created_at, updated_at
		FROM provisioning_jobs
		WHERE id = $1
	`, jobID).Scan(
		&item.ID, &item.RequestID, &item.TraceID, &item.Action, &item.ResourceType, &item.Provider, &item.Status, &item.ExternalID, &item.Error,
		&item.ResponseJSON, &item.Attempts, &item.NextRetryAt, &item.ExpiresAt, &item.CreatedAt, &item.UpdatedAt,
	)
	return item, err
}

func (r *Repo) CreateJob(ctx context.Context, item models.Job) (models.Job, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO provisioning_jobs (id, request_id, trace_id, action, resource_type, provider, status, external_id, error, response_json, attempts, next_retry_at, expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING created_at, updated_at
	`, item.ID, item.RequestID, item.TraceID, item.Action, item.ResourceType, item.Provider, item.Status, item.ExternalID, item.Error, item.ResponseJSON, item.Attempts, nullableTime(item.NextRetryAt), nullableTime(item.ExpiresAt)).Scan(&item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *Repo) MarkJobSucceeded(ctx context.Context, jobID string, externalID string, response any) error {
	raw, _ := json.Marshal(response)
	_, err := r.db.Exec(ctx, `
		UPDATE provisioning_jobs
		SET status = $2, external_id = $3, response_json = $4, error = '', updated_at = NOW()
		WHERE id = $1
	`, jobID, models.JobStatusSucceeded, externalID, string(raw))
	return err
}

func (r *Repo) MarkJobFailed(ctx context.Context, jobID string, nextRetryAt time.Time, errorMessage string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE provisioning_jobs
		SET status = $2, attempts = attempts + 1, next_retry_at = $3, error = $4, updated_at = NOW()
		WHERE id = $1
	`, jobID, models.JobStatusFailed, nullableTime(nextRetryAt), errorMessage)
	return err
}

func (r *Repo) UpsertExternalResource(ctx context.Context, item models.ExternalResource) (models.ExternalResource, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO external_resources (id, provider, resource_type, provider_id, user_id, internal_id, external_id, status, public_ip, expires_at, deleted_at, last_error)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		ON CONFLICT (external_id, provider, resource_type) DO UPDATE SET
			status = EXCLUDED.status,
			public_ip = EXCLUDED.public_ip,
			expires_at = EXCLUDED.expires_at,
			deleted_at = EXCLUDED.deleted_at,
			last_error = EXCLUDED.last_error,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`, item.ID, item.Provider, item.ResourceType, item.ProviderID, item.UserID, item.InternalID, item.ExternalID, item.Status, item.PublicIP, item.ExpiresAt, item.DeletedAt, item.LastError).Scan(&item.ID, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}

func (r *Repo) LockExpiredResources(ctx context.Context, now time.Time, limit int) ([]models.ExternalResource, error) {
	rows, err := r.db.Query(ctx, `
		WITH candidates AS (
			SELECT id
			FROM external_resources
			WHERE status IN ('running', 'active')
			  AND expires_at <= $1
			  AND deleted_at IS NULL
			ORDER BY expires_at ASC
			FOR UPDATE SKIP LOCKED
			LIMIT $2
		)
		SELECT e.id, e.provider, e.resource_type, e.provider_id, e.user_id, e.internal_id, e.external_id, e.status, e.public_ip, e.expires_at,
		       e.deleted_at, e.last_error, e.created_at, e.updated_at
		FROM external_resources e
		JOIN candidates c ON c.id = e.id
	`, now, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]models.ExternalResource, 0)
	for rows.Next() {
		var item models.ExternalResource
		if err := rows.Scan(
			&item.ID, &item.Provider, &item.ResourceType, &item.ProviderID, &item.UserID, &item.InternalID, &item.ExternalID, &item.Status,
			&item.PublicIP, &item.ExpiresAt, &item.DeletedAt, &item.LastError, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *Repo) MarkExternalResourceDeleted(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE external_resources
		SET status = 'deleted', deleted_at = NOW(), last_error = '', updated_at = NOW()
		WHERE id = $1
	`, id)
	return err
}

func (r *Repo) MarkExternalResourceDeleteError(ctx context.Context, id string, errorMessage string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE external_resources
		SET last_error = $2, updated_at = NOW()
		WHERE id = $1
	`, id, errorMessage)
	return err
}

func nullableTime(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	return &value
}
