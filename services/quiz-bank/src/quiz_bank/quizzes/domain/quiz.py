from dataclasses import dataclass, field, replace
from datetime import UTC, datetime

from quiz_bank.shared.errors import ValidationError, already_exists, failed_precondition, not_found

DEFAULT_TIME_PER_QUESTION = 30


def _now() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class OptionSnapshot:
    id: str
    text: str
    is_correct: bool


@dataclass(frozen=True)
class QuestionSnapshot:
    source_question_id: str
    type: str
    text: str
    options: tuple[OptionSnapshot, ...]
    difficulty: str | None
    tags: tuple[str, ...]
    position: int = 0


@dataclass
class QuizSettings:
    time_per_question_seconds: int = DEFAULT_TIME_PER_QUESTION
    speed_bonus_enabled: bool = False


def _validate_title(title: str) -> str:
    if not title.strip():
        raise ValidationError(["title: nu poate fi gol"])
    return title.strip()


def _numbered(snapshots: list[QuestionSnapshot]) -> list[QuestionSnapshot]:
    return [replace(s, position=i) for i, s in enumerate(snapshots, start=1)]


@dataclass
class Quiz:
    owner_id: str
    title: str
    questions: list[QuestionSnapshot]
    settings: QuizSettings = field(default_factory=QuizSettings)
    id: str | None = None
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)

    @classmethod
    def create(
        cls,
        owner_id: str,
        title: str,
        snapshots: list[QuestionSnapshot],
        settings: QuizSettings | None = None,
    ) -> "Quiz":
        errors: list[str] = []
        if not title.strip():
            errors.append("title: nu poate fi gol")
        if not snapshots:
            errors.append("questions: trebuie sa existe cel putin o intrebare")
        if errors:
            raise ValidationError(errors)

        seen: set[str] = set()
        for s in snapshots:
            if s.source_question_id in seen:
                raise already_exists("intrebarea exista deja in quiz")
            seen.add(s.source_question_id)

        return cls(
            owner_id=owner_id,
            title=title.strip(),
            questions=_numbered(list(snapshots)),
            settings=settings or QuizSettings(),
        )

    def _touch(self) -> None:
        self.updated_at = _now()

    def rename(self, title: str) -> None:
        self.title = _validate_title(title)
        self._touch()

    def add_question(self, snapshot: QuestionSnapshot) -> None:
        if any(q.source_question_id == snapshot.source_question_id for q in self.questions):
            raise already_exists("intrebarea exista deja in quiz")
        self.questions = _numbered([*self.questions, snapshot])
        self._touch()

    def remove_question(self, source_question_id: str) -> None:
        remaining = [q for q in self.questions if q.source_question_id != source_question_id]
        if len(remaining) == len(self.questions):
            raise not_found("intrebarea nu exista in quiz")
        if not remaining:
            raise failed_precondition("un quiz trebuie sa aiba cel putin o intrebare")
        self.questions = _numbered(remaining)
        self._touch()

    def reorder(self, question_ids: list[str]) -> None:
        current = [q.source_question_id for q in self.questions]
        if sorted(question_ids) != sorted(current):
            raise ValidationError(
                ["question_ids: trebuie sa fie o permutare a intrebarilor curente"]
            )
        by_id = {q.source_question_id: q for q in self.questions}
        self.questions = _numbered([by_id[i] for i in question_ids])
        self._touch()