import logging
import signal
from concurrent.futures import ThreadPoolExecutor

import grpc
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

from quiz_bank.config import load_config
from quiz_bank.infrastructure.mongo import create_client, ensure_indexes
from quiz_bank.shared.auth import AuthInterceptor

logger = logging.getLogger("quiz_bank")


def build_server(port: int, max_workers: int = 10) -> tuple[grpc.Server, int]:
    """Creeaza serverul gRPC. Intoarce (server, portul efectiv legat)."""
    server = grpc.server(
        ThreadPoolExecutor(max_workers=max_workers),
        interceptors=[AuthInterceptor()],
    )

    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)
    health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)

    bound_port = server.add_insecure_port(f"0.0.0.0:{port}")
    return server, bound_port


def serve() -> None:
    logging.basicConfig(level=logging.INFO)
    config = load_config()

    client = create_client(config.mongo_uri)
    ensure_indexes(client)

    server, port = build_server(config.grpc_port)
    server.start()
    logger.info("quiz-bank asculta pe portul %s", port)

    def _stop(*_: object) -> None:
        server.stop(grace=5)

    signal.signal(signal.SIGTERM, _stop)
    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        server.stop(grace=5).wait()
    finally:
        client.close()


if __name__ == "__main__":
    serve()