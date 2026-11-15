import functools
from collections.abc import Callable
from typing import Any

import grpc

from quiz_bank.shared.errors import DomainError, ErrorCode

_CODES = {
    ErrorCode.VALIDATION: grpc.StatusCode.INVALID_ARGUMENT,
    ErrorCode.NOT_FOUND: grpc.StatusCode.NOT_FOUND,
    ErrorCode.ALREADY_EXISTS: grpc.StatusCode.ALREADY_EXISTS,
    ErrorCode.FAILED_PRECONDITION: grpc.StatusCode.FAILED_PRECONDITION,
}


def translate_errors(method: Callable[..., Any]) -> Callable[..., Any]:
    @functools.wraps(method)
    def wrapper(self: Any, request: Any, context: grpc.ServicerContext) -> Any:
        try:
            return method(self, request, context)
        except DomainError as error:
            context.abort(_CODES[error.code], error.message)

    return wrapper