import copy
from uuid import uuid4

import pytest

from quiz_bank.questions.domain.question import Question
from quiz_bank.quizzes.domain.quiz import OptionSnapshot, QuestionSnapshot, Quiz


class InMemoryQuestionRepository:
    def __init__(self) -> None:
        self.items: dict[str, Question] = {}

    def add(self, question: Question) -> Question:
        question.id = uuid4().hex
        self.items[question.id] = copy.deepcopy(question)
        return copy.deepcopy(question)

    def get(self, question_id: str, owner_id: str) -> Question | None:
        q = self.items.get(question_id)
        if q is None or q.owner_id != owner_id:
            return None
        return copy.deepcopy(q)

    def save(self, question: Question) -> None:
        assert question.id is not None
        self.items[question.id] = copy.deepcopy(question)

    def delete(self, question_id: str, owner_id: str) -> bool:
        q = self.items.get(question_id)
        if q is None or q.owner_id != owner_id:
            return False
        del self.items[question_id]
        return True

    def list(self, owner_id: str, skip: int, limit: int) -> tuple[list[Question], int]:
        mine = [q for q in self.items.values() if q.owner_id == owner_id]
        return [copy.deepcopy(q) for q in mine[skip : skip + limit]], len(mine)


class InMemoryQuizRepository:
    def __init__(self) -> None:
        self.items: dict[str, Quiz] = {}

    def add(self, quiz: Quiz) -> Quiz:
        quiz.id = uuid4().hex
        self.items[quiz.id] = copy.deepcopy(quiz)
        return copy.deepcopy(quiz)

    def get(self, quiz_id: str, owner_id: str) -> Quiz | None:
        q = self.items.get(quiz_id)
        if q is None or q.owner_id != owner_id:
            return None
        return copy.deepcopy(q)

    def save(self, quiz: Quiz) -> None:
        assert quiz.id is not None
        self.items[quiz.id] = copy.deepcopy(quiz)

    def delete(self, quiz_id: str, owner_id: str) -> bool:
        q = self.items.get(quiz_id)
        if q is None or q.owner_id != owner_id:
            return False
        del self.items[quiz_id]
        return True

    def list(self, owner_id: str, skip: int, limit: int) -> tuple[list[Quiz], int]:
        mine = [q for q in self.items.values() if q.owner_id == owner_id]
        return [copy.deepcopy(q) for q in mine[skip : skip + limit]], len(mine)


class FakeQuestionReader:
    """Cititor de intrebari fals, pentru testele de quiz."""

    def __init__(self) -> None:
        self.items: dict[tuple[str, str], QuestionSnapshot] = {}

    def add(self, question_id: str, owner_id: str, text: str = "t") -> None:
        self.items[(question_id, owner_id)] = QuestionSnapshot(
            source_question_id=question_id,
            type="SINGLE_CHOICE",
            text=text,
            options=(
                OptionSnapshot(id="o1", text="a", is_correct=True),
                OptionSnapshot(id="o2", text="b", is_correct=False),
            ),
            difficulty=None,
            tags=(),
        )

    def read(self, question_id: str, owner_id: str) -> QuestionSnapshot | None:
        return self.items.get((question_id, owner_id))


@pytest.fixture
def question_repo() -> InMemoryQuestionRepository:
    return InMemoryQuestionRepository()


@pytest.fixture
def quiz_repo() -> InMemoryQuizRepository:
    return InMemoryQuizRepository()


@pytest.fixture
def question_reader() -> FakeQuestionReader:
    reader = FakeQuestionReader()
    for qid in ("q1", "q2", "q3"):
        reader.add(qid, "u1")
    reader.add("x1", "u2")
    return reader