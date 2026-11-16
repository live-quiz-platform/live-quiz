from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import grpc

USER_ID_KEY = "x-user-id"
USER_ROLE_KEY = "x-user-role"
TEACHER_ROLE = "TEACHER"
HEALTH_PREFIX = "/grpc.health.v1."


@dataclass(frozen=True)
class Identity:
    user_id: str
    role: str


def _metadata_dict(metadata: Any) -> dict[str, str]:
    return {item.key: item.value for item in (metadata or [])}


def identity_from(context: grpc.ServicerContext) -> Identity:
    md = _metadata_dict(context.invocation_metadata())
    return Identity(user_id=md[USER_ID_KEY], role=md[USER_ROLE_KEY])


def _abort_handler(code: grpc.StatusCode, message: str) -> grpc.RpcMethodHandler:
    def behavior(request: Any, context: grpc.ServicerContext) -> None:
        context.abort(code, message)

    return grpc.unary_unary_rpc_method_handler(behavior)


class AuthInterceptor(grpc.ServerInterceptor):
    def intercept_service(
        self,
        continuation: Callable[[grpc.HandlerCallDetails], grpc.RpcMethodHandler | None],
        handler_call_details: grpc.HandlerCallDetails,
    ) -> grpc.RpcMethodHandler | None:
        if handler_call_details.method.startswith(HEALTH_PREFIX):
            return continuation(handler_call_details)

        md = _metadata_dict(handler_call_details.invocation_metadata)
        user_id = md.get(USER_ID_KEY)
        role = md.get(USER_ROLE_KEY)

        if not user_id or not role:
            return _abort_handler(
                grpc.StatusCode.UNAUTHENTICATED,
                "lipsesc x-user-id sau x-user-role",
            )
        if role != TEACHER_ROLE:
            return _abort_handler(
                grpc.StatusCode.PERMISSION_DENIED,
                "acces permis doar profesorilor",
            )
        return continuation(handler_call_details)