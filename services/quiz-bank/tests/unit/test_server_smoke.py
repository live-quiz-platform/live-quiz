import grpc
import pytest
from grpc_health.v1 import health_pb2, health_pb2_grpc

from quiz_bank.main import build_server

FAKE_METHOD = "/quiz.v1.QuizService/GetQuiz"


@pytest.fixture
def channel():
    server, port = build_server(0)
    server.start()
    with grpc.insecure_channel(f"localhost:{port}") as ch:
        yield ch
    server.stop(grace=None)


def _call(channel: grpc.Channel, metadata: tuple[tuple[str, str], ...]) -> grpc.RpcError:
    with pytest.raises(grpc.RpcError) as exc:
        channel.unary_unary(FAKE_METHOD)(b"", metadata=metadata)
    return exc.value


def test_health_check_trece_fara_metadata(channel: grpc.Channel) -> None:
    stub = health_pb2_grpc.HealthStub(channel)
    response = stub.Check(health_pb2.HealthCheckRequest(service=""))
    assert response.status == health_pb2.HealthCheckResponse.SERVING


def test_fara_metadata_da_unauthenticated(channel: grpc.Channel) -> None:
    error = _call(channel, ())
    assert error.code() == grpc.StatusCode.UNAUTHENTICATED


def test_rol_gresit_da_permission_denied(channel: grpc.Channel) -> None:
    error = _call(channel, (("x-user-id", "u1"), ("x-user-role", "STUDENT")))
    assert error.code() == grpc.StatusCode.PERMISSION_DENIED