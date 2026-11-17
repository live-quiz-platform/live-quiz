package grpcserver

import (
	"context"
	"errors"

	identityv1 "github.com/live-quiz-platform/live-quiz/services/identity/api/identity/v1"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/token"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/user"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	identityv1.UnimplementedIdentityServiceServer

	registrationService   *user.RegistrationService
	authenticationService *user.AuthenticationService
	tokenManager          *token.Manager
}

func NewServer(
	registrationService *user.RegistrationService,
	authenticationService *user.AuthenticationService,
	tokenManager *token.Manager,
) *Server {
	return &Server{
		registrationService:   registrationService,
		authenticationService: authenticationService,
		tokenManager:          tokenManager,
	}
}

func (s *Server) Register(
	ctx context.Context,
	req *identityv1.RegisterRequest,
) (*identityv1.RegisterResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "request is required")
	}

	result, err := s.registrationService.Register(
		ctx,
		req.GetEmail(),
		req.GetPassword(),
		req.GetDisplayName(),
	)
	if err != nil {
		switch {
		case errors.Is(err, user.ErrInvalidEmail):
			return nil, status.Error(codes.InvalidArgument, "email: invalid format")

		case errors.Is(err, user.ErrEmailAlreadyExists):
			return nil, status.Error(codes.AlreadyExists, "email: already exists")

		case errors.Is(err, user.ErrPasswordTooShort):
			return nil, status.Error(codes.InvalidArgument, "password: must contain at least 8 characters")

		case errors.Is(err, user.ErrInvalidDisplayName):
			return nil, status.Error(codes.InvalidArgument, "display_name: is required")

		default:
			return nil, status.Error(codes.Internal, "registration failed")
		}
	}

	return &identityv1.RegisterResponse{
		UserId:      result.ID,
		Email:       result.Email,
		DisplayName: result.DisplayName,
	}, nil
}

func (s *Server) Login(
	ctx context.Context,
	req *identityv1.LoginRequest,
) (*identityv1.LoginResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "request is required")
	}

	result, err := s.authenticationService.Authenticate(
		ctx,
		req.GetEmail(),
		req.GetPassword(),
	)
	if err != nil {
		switch {
		case errors.Is(err, user.ErrInvalidCredentials):
			return nil, status.Error(codes.Unauthenticated, "invalid email or password")

		default:
			return nil, status.Error(codes.Internal, "authentication failed")
		}
	}

	accessToken, expiresAt, err := s.tokenManager.Generate(result.ID, result.Role)
	if err != nil {
		return nil, status.Error(codes.Internal, "token generation failed")
	}

	return &identityv1.LoginResponse{
		AccessToken: accessToken,
		UserId:      result.ID,
		Role:        result.Role,
		ExpiresAt:   expiresAt.Unix(),
	}, nil
}
