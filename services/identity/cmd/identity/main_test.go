package main

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	identityv1 "github.com/live-quiz-platform/live-quiz/services/identity/api/identity/v1"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/config"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

type testIdentityServer struct {
	identityv1.UnimplementedIdentityServiceServer
}

func TestGRPCServerRequiresTLS(t *testing.T) {
	certFile, keyFile, certificate := writeTestTLSFiles(t)
	server, _, err := newGRPCServer(testIdentityServer{}, config.GRPCConfig{
		TLSCertFile: certFile,
		TLSKeyFile:  keyFile,
	})
	if err != nil {
		t.Fatalf("create gRPC server: %v", err)
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}

	serveErr := make(chan error, 1)
	go func() {
		serveErr <- server.Serve(listener)
	}()
	t.Cleanup(func() {
		server.Stop()
		select {
		case <-serveErr:
		case <-time.After(time.Second):
			t.Error("gRPC server did not stop")
		}
	})

	plaintextCtx, cancelPlaintext := context.WithTimeout(context.Background(), 250*time.Millisecond)
	_, err = grpc.DialContext(
		plaintextCtx,
		listener.Addr().String(),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	cancelPlaintext()
	if err == nil {
		t.Fatal("expected plaintext connection to fail")
	}

	roots := x509.NewCertPool()
	if !roots.AppendCertsFromPEM(certificate) {
		t.Fatal("add test certificate to root pool")
	}

	tlsCtx, cancelTLS := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancelTLS()
	connection, err := grpc.DialContext(
		tlsCtx,
		listener.Addr().String(),
		grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(roots, "localhost")),
		grpc.WithBlock(),
	)
	if err != nil {
		t.Fatalf("connect with TLS: %v", err)
	}
	defer connection.Close()

	response, err := healthpb.NewHealthClient(connection).Check(
		tlsCtx,
		&healthpb.HealthCheckRequest{Service: "identity.v1.IdentityService"},
	)
	if err != nil {
		t.Fatalf("check health over TLS: %v", err)
	}
	if response.GetStatus() != healthpb.HealthCheckResponse_SERVING {
		t.Fatalf("health status = %v, want SERVING", response.GetStatus())
	}
}

func writeTestTLSFiles(t *testing.T) (string, string, []byte) {
	t.Helper()

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate private key: %v", err)
	}

	template := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "localhost"},
		NotBefore:             time.Now().Add(-time.Minute),
		NotAfter:              time.Now().Add(time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
		DNSNames:              []string{"localhost"},
	}

	certificateDER, err := x509.CreateCertificate(
		rand.Reader,
		template,
		template,
		&privateKey.PublicKey,
		privateKey,
	)
	if err != nil {
		t.Fatalf("create certificate: %v", err)
	}

	certificate := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certificateDER,
	})
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	})

	certFile := filepath.Join(t.TempDir(), "server.crt")
	keyFile := filepath.Join(t.TempDir(), "server.key")
	if err := os.WriteFile(certFile, certificate, 0600); err != nil {
		t.Fatalf("write certificate: %v", err)
	}
	if err := os.WriteFile(keyFile, privateKeyPEM, 0600); err != nil {
		t.Fatalf("write private key: %v", err)
	}

	return certFile, keyFile, certificate
}
