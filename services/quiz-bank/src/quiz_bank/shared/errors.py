from enum import Enum


class ErrorCode(Enum):
    VALIDATION = "VALIDATION"
    NOT_FOUND = "NOT_FOUND"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    FAILED_PRECONDITION = "FAILED_PRECONDITION"
    CONFLICT = "CONFLICT"


class DomainError(Exception):
    def __init__(self, code: ErrorCode, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class ValidationError(DomainError):
    """Poarta TOATE erorile de validare, in forma 'camp: motiv'."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__(ErrorCode.VALIDATION, "\n".join(errors))
        self.errors = errors


def not_found(message: str = "resursa nu exista") -> DomainError:
    return DomainError(ErrorCode.NOT_FOUND, message)


def already_exists(message: str) -> DomainError:
    return DomainError(ErrorCode.ALREADY_EXISTS, message)


def failed_precondition(message: str) -> DomainError:
    return DomainError(ErrorCode.FAILED_PRECONDITION, message)


def conflict(message: str) -> DomainError:
    return DomainError(ErrorCode.CONFLICT, message)