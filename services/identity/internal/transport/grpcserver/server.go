package grpcserver

import (
	"context"
	"errors"

	identityv1 "github.com/live-quiz-platform/live-quiz/services/identity/api/identity/v1"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/user"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	identityv1.UnimplementedIdentityServiceServer

	registrationService *user.RegistrationService
}

func NewServer(registrationService *user.RegistrationService) *Server {
	return &Server{
		registrationService: registrationService,
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
