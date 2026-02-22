FROM golang:1.25 AS builder
WORKDIR /src
COPY services ./services
COPY go.work ./
RUN cd services/billingservice && go mod tidy && go build -o /bin/billingservice ./cmd

FROM gcr.io/distroless/base-debian12
COPY --from=builder /bin/billingservice /billingservice
ENTRYPOINT ["/billingservice"]
