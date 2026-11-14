# Build stage
FROM golang:1.27.4-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /identity \
    ./cmd/identity

RUN GOBIN=/out CGO_ENABLED=0 go install \
    github.com/grpc-ecosystem/grpc-health-probe@v0.4.38

# Runtime stage
FROM scratch

COPY --from=builder /identity /identity
COPY --from=builder /out/grpc-health-probe /grpc_health_probe

USER 65532:65532

EXPOSE 50051

ENTRYPOINT ["/identity"]