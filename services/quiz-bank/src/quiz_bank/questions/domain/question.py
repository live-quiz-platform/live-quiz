from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from uuid import uuid4

from quiz_bank.shared.errors import ValidationError

MIN_OPTIONS = 2
MAX_OPTIONS = 6
TRUE_FALSE_TEXTS = ("Adevarat", "Fals")


class QuestionType(Enum):
    SINGLE_CHOICE = "SINGLE_CHOICE"
    TRUE_FALSE = "TRUE_FALSE"


class Difficulty(Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


@dataclass(frozen=True)
class OptionInput:
    text: str
    is_correct: bool


@dataclass
class AnswerOption:
    id: str
    text: str
    is_correct: bool


def _normalize(text: str) -> str:
    return " ".join(text.split()).lower()


def _now() -> datetime:
    return datetime.now(UTC)


def _build_options(
    type: QuestionType | None, options: list[OptionInput], errors: list[str]
) -> list[AnswerOption]:
    correct = sum(1 for o in options if o.is_correct)

    if type == QuestionType.TRUE_FALSE:
        if len(options) != 2:
            errors.append("options: adevarat/fals cere exact 2 variante")
        if correct != 1:
            errors.append("options: trebuie sa existe exact un raspuns corect")
        if errors:
            return []
        return [
            AnswerOption(id=uuid4().hex, text=text, is_correct=o.is_correct)
            for text, o in zip(TRUE_FALSE_TEXTS, options, strict=True)
        ]

    if not MIN_OPTIONS <= len(options) <= MAX_OPTIONS:
        errors.append(f"options: trebuie sa existe intre {MIN_OPTIONS} si {MAX_OPTIONS} variante")
    if correct != 1:
        errors.append("options: trebuie sa existe exact un raspuns corect")
    for i, o in enumerate(options):
        if not o.text.strip():
            errors.append(f"options[{i}].text: nu poate fi gol")
    normalized = [_normalize(o.text) for o in options if o.text.strip()]
    if len(set(normalized)) != len(normalized):
        errors.append("options: variantele trebuie sa fie distincte")
    return [
        AnswerOption(id=uuid4().hex, text=o.text.strip(), is_correct=o.is_correct)
        for o in options
    ]


def _validate(
    type: QuestionType | None, text: str, options: list[OptionInput]
) -> tuple[str, list[AnswerOption]]:
    errors: list[str] = []
    if type is None:
        errors.append("type: este obligatoriu")
    if not text.strip():
        errors.append("text: nu poate fi gol")
    built = _build_options(type, options, errors)
    if errors:
        raise ValidationError(errors)
    return text.strip(), built


@dataclass
class Question:
    owner_id: str
    type: QuestionType
    text: str
    options: list[AnswerOption]
    difficulty: Difficulty | None = None
    tags: list[str] = field(default_factory=list)
    id: str | None = None
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)
    version: int = 0

    @classmethod
    def create(
        cls,
        owner_id: str,
        type: QuestionType | None,
        text: str,
        options: list[OptionInput],
        difficulty: Difficulty | None = None,
        tags: list[str] | None = None,
    ) -> "Question":
        clean_text, built = _validate(type, text, options)
        assert type is not None
        return cls(
            owner_id=owner_id,
            type=type,
            text=clean_text,
            options=built,
            difficulty=difficulty,
            tags=list(tags or []),
        )

    def update(
        self,
        type: QuestionType | None,
        text: str,
        options: list[OptionInput],
        difficulty: Difficulty | None = None,
        tags: list[str] | None = None,
    ) -> None:
        clean_text, built = _validate(type, text, options)
        assert type is not None
        self.type = type
        self.text = clean_text
        self.options = built
        self.difficulty = difficulty
        self.tags = list(tags or [])
        self.updated_at = _now()