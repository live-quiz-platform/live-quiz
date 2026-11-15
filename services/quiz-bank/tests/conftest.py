import copy
from uuid import uuid4

import pytest

from quiz_bank.questions.domain.question import Question


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


@pytest.fixture
def question_repo() -> InMemoryQuestionRepository:
    return InMemoryQuestionRepository()