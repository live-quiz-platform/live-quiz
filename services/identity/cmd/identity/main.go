package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	identityv1 "github.com/live-quiz-platform/live-quiz/services/identity/api/identity/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/reflection"

	"github.com/live-quiz-platform/live-quiz/services/identity/internal/config"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/database"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/transport/grpcserver"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/user"
	userpostgres "github.com/live-quiz-platform/live-quiz/services/identity/internal/user/postgres"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("identity service failed: %v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	startupCtx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	pool, err := database.NewPostgresPool(startupCtx, cfg.Postgres)
	if err != nil {
		return err
	}
	defer pool.Close()

	repository := userpostgres.NewRepository(pool)

	registrationService := user.NewRegistrationService(repository)

	grpcHandler := grpcserver.NewServer(registrationService)

	grpcServer, healthServer, err := newGRPCServer(grpcHandler, cfg.GRPC)
	if err != nil {
		return err
	}

	listener, err := net.Listen(
		"tcp",
		fmt.Sprintf(":%d", cfg.GRPC.Port),
	)
	if err != nil {
		return fmt.Errorf("start gRPC listener: %w", err)
	}

	log.Printf("identity gRPC server listening on port %d", cfg.GRPC.Port)

	serveErr := make(chan error, 1)

	go func() {
		serveErr <- grpcServer.Serve(listener)
	}()

	log.Println("identity service initialized successfully")

	shutdownCtx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	select {
	case <-shutdownCtx.Done():
		log.Println("identity service shutting down")

		setHealthStatus(healthServer, healthpb.HealthCheckResponse_NOT_SERVING)
		grpcServer.GracefulStop()
		return nil

	case err := <-serveErr:
		if err == nil {
			return fmt.Errorf("gRPC server stopped unexpectedly")
		}
		return fmt.Errorf("gRPC server stopped unexpectedly: %w", err)
	}
}

func newGRPCServer(
	identityHandler identityv1.IdentityServiceServer,
	cfg config.GRPCConfig,
) (*grpc.Server, *health.Server, error) {
	transportCredentials, err := credentials.NewServerTLSFromFile(
		cfg.TLSCertFile,
		cfg.TLSKeyFile,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("load gRPC TLS credentials: %w", err)
	}

	grpcServer := grpc.NewServer(grpc.Creds(transportCredentials))
	identityv1.RegisterIdentityServiceServer(grpcServer, identityHandler)

	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, healthServer)
	reflection.Register(grpcServer)
	setHealthStatus(healthServer, healthpb.HealthCheckResponse_SERVING)

	return grpcServer, healthServer, nil
}

func setHealthStatus(
	healthServer *health.Server,
	status healthpb.HealthCheckResponse_ServingStatus,
) {
	healthServer.SetServingStatus("", status)
	healthServer.SetServingStatus("identity.v1.IdentityService", status)
}
