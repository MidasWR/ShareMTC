package httpx

import (
	"net/http"
	"time"

	"github.com/rs/zerolog"
)

type responseCapture struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
	bytes       int
}

func (c *responseCapture) WriteHeader(status int) {
	c.status = status
	c.wroteHeader = true
	c.ResponseWriter.WriteHeader(status)
}

func (c *responseCapture) Write(b []byte) (int, error) {
	if !c.wroteHeader {
		c.WriteHeader(http.StatusOK)
	}
	n, err := c.ResponseWriter.Write(b)
	c.bytes += n
	return n, err
}

// RequestLogger logs every HTTP request/response pair to stdout through zerolog.
func RequestLogger(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			capture := &responseCapture{
				ResponseWriter: w,
				status:         http.StatusOK,
			}
			next.ServeHTTP(capture, r)
			duration := time.Since(start)
			event := logger.Info()
			if capture.status >= 500 {
				event = logger.Error()
			} else if capture.status >= 400 {
				event = logger.Warn()
			}
			event.
				Str("http_method", r.Method).
				Str("http_path", r.URL.Path).
				Str("http_query", r.URL.RawQuery).
				Str("remote_addr", r.RemoteAddr).
				Str("user_agent", r.UserAgent()).
				Int("status_code", capture.status).
				Int("response_bytes", capture.bytes).
				Dur("duration", duration).
				Msg("http request processed")
		})
	}
}
