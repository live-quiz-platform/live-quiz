from typing import Protocol

from quiz_bank.questions.domain.question import (
    Difficulty,
    OptionInput,
    Question,
    QuestionType,
)
from quiz_bank.shared.errors import not_found

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class QuestionRepository(Protocol):
    def add(self, question: Question) -> Question: ...

    def get(self, question_id: str, owner_id: str) -> Question | None: ...

    def save(self, question: Question) -> None: ...

    def delete(self, question_id: str, owner_id: str) -> bool: ...

    def list(self, owner_id: str, skip: int, limit: int) -> tuple[list[Question], int]: ...


class QuestionService:
    def __init__(self, repository: QuestionRepository) -> None:
        self._repo = repository

    def create(
        self,
        owner_id: str,
        type: QuestionType | None,
        text: str,
        options: list[OptionInput],
        difficulty: Difficulty | None = None,
        tags: list[str] | None = None,
    ) -> Question:
        question = Question.create(owner_id, type, text, options, difficulty, tags)
        return self._repo.add(question)

    def update(
        self,
        owner_id: str,
        question_id: str,
        type: QuestionType | None,
        text: str,
        options: list[OptionInput],
        difficulty: Difficulty | None = None,
        tags: list[str] | None = None,
    ) -> Question:
        question = self.get(owner_id, question_id)
        question.update(type, text, options, difficulty, tags)
        self._repo.save(question)
        return question

    def delete(self, owner_id: str, question_id: str) -> None:
        if not self._repo.delete(question_id, owner_id):
            raise not_found("intrebarea nu exista")

    def get(self, owner_id: str, question_id: str) -> Question:
        question = self._repo.get(question_id, owner_id)
        if question is None:
            raise not_found("intrebarea nu exista")
        return question

    def list(self, owner_id: str, page: int, page_size: int) -> tuple[list[Question], int]:
        page = max(page, 1)
        if page_size <= 0:
            page_size = DEFAULT_PAGE_SIZE
        page_size = min(page_size, MAX_PAGE_SIZE)
        return self._repo.list(owner_id, (page - 1) * page_size, page_size)