FROM golang:1.25 AS builder
WORKDIR /src
COPY services ./services
COPY go.work ./
RUN cd services/hostagent && go mod tidy && go build -o /bin/hostagent ./cmd

FROM gcr.io/distroless/base-debian12
COPY --from=builder /bin/hostagent /hostagent
ENTRYPOINT ["/hostagent"]
