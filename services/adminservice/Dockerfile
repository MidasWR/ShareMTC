FROM golang:1.25 AS builder
WORKDIR /src
COPY services ./services
COPY go.work ./
RUN cd services/adminservice && go mod tidy && go build -o /bin/adminservice ./cmd

FROM gcr.io/distroless/base-debian12
COPY --from=builder /bin/adminservice /adminservice
ENTRYPOINT ["/adminservice"]
