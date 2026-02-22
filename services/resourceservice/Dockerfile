FROM golang:1.25 AS builder
WORKDIR /src
COPY services ./services
COPY go.work ./
RUN cd services/resourceservice && go mod tidy && go build -o /bin/resourceservice ./cmd

FROM gcr.io/distroless/base-debian12
COPY --from=builder /bin/resourceservice /resourceservice
ENTRYPOINT ["/resourceservice"]
