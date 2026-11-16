import sys

import grpc
from grpc_health.v1 import health_pb2, health_pb2_grpc

target = sys.argv[1] if len(sys.argv) > 1 else "localhost:50052"
with grpc.insecure_channel(target) as channel:
    response = health_pb2_grpc.HealthStub(channel).Check(
        health_pb2.HealthCheckRequest(service=""), timeout=3
    )
status = health_pb2.HealthCheckResponse.ServingStatus.Name(response.status)
print(status)
sys.exit(0 if status == "SERVING" else 1)