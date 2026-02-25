FROM golang:1.25-alpine AS builder
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY services ./services
COPY go.work ./
RUN cd services/authservice && go mod tidy && CGO_ENABLED=0 go build -o /bin/authservice ./cmd

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /bin/authservice /authservice
ENTRYPOINT ["/authservice"]
