import os
from dataclasses import dataclass

DEFAULT_GRPC_PORT = 50052
DEFAULT_MONGO_URI = "mongodb://mongoadmin:change_me_mongo@localhost:27017/?authSource=admin"


@dataclass(frozen=True)
class Config:
    grpc_port: int
    mongo_uri: str


def load_config() -> Config:
    return Config(
        grpc_port=int(os.environ.get("GRPC_PORT", DEFAULT_GRPC_PORT)),
        mongo_uri=os.environ.get("MONGO_URI", DEFAULT_MONGO_URI),
    )