package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
)

type claimsContextKey struct{}

func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rawHeader := r.Header.Get("Authorization")
			if rawHeader == "" {
				httpx.Error(w, http.StatusUnauthorized, "missing authorization header")
				return
			}
			parts := strings.SplitN(rawHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
				httpx.Error(w, http.StatusUnauthorized, "invalid authorization header")
				return
			}
			claims, err := Parse(jwtSecret, strings.TrimSpace(parts[1]))
			if err != nil {
				httpx.Error(w, http.StatusUnauthorized, "invalid token")
				return
			}
			ctx := context.WithValue(r.Context(), claimsContextKey{}, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAnyRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := ClaimsFromContext(r.Context())
			if claims == nil {
				httpx.Error(w, http.StatusUnauthorized, "unauthenticated")
				return
			}
			if _, ok := allowed[claims.Role]; !ok {
				httpx.Error(w, http.StatusForbidden, "insufficient role")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func ClaimsFromContext(ctx context.Context) *Claims {
	claims, _ := ctx.Value(claimsContextKey{}).(*Claims)
	return claims
}
