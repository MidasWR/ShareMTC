FROM golang:1.25 AS builder
WORKDIR /src
COPY services ./services
COPY go.work ./
RUN cd services/authservice && go mod tidy && go build -o /bin/authservice ./cmd

FROM gcr.io/distroless/base-debian12
COPY --from=builder /bin/authservice /authservice
ENTRYPOINT ["/authservice"]
