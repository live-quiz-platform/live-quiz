from collections.abc import Iterator

import grpc
import pytest
from pymongo import MongoClient
from testcontainers.community.mongodb import MongoDbContainer

from quiz_bank.composition import register_services
from quiz_bank.infrastructure.mongo import (
    QUESTION_BANK_DB,
    QUIZ_DB,
    create_client,
    ensure_indexes,
)
from quiz_bank.main import build_server


@pytest.fixture(scope="session")
def mongo_client() -> Iterator[MongoClient]:
    with MongoDbContainer("mongo:9.0.4") as container:
        client = create_client(container.get_connection_url())
        ensure_indexes(client)
        yield client
        client.close()


@pytest.fixture(autouse=True)
def clean_db(mongo_client: MongoClient) -> None:
    mongo_client.drop_database(QUESTION_BANK_DB)
    mongo_client.drop_database(QUIZ_DB)


@pytest.fixture
def grpc_channel(mongo_client: MongoClient) -> Iterator[grpc.Channel]:
    server, port = build_server(0, register=register_services(mongo_client))
    server.start()
    with grpc.insecure_channel(f"localhost:{port}") as channel:
        yield channel
    server.stop(grace=None)


def teacher(user_id: str) -> tuple[tuple[str, str], ...]:
    return (("x-user-id", user_id), ("x-user-role", "TEACHER"))