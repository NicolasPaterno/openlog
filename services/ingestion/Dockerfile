# -- Build stage --
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /ingestion ./cmd/server

# -- Runtime stage --
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

COPY --from=builder /ingestion /ingestion

EXPOSE 8080

ENTRYPOINT ["/ingestion"]
