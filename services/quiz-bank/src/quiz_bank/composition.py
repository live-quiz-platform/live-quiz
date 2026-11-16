from collections.abc import Callable

import grpc
from pymongo import MongoClient

from quiz_bank.generated.question_bank.v1 import question_bank_pb2_grpc
from quiz_bank.generated.quiz.v1 import quiz_pb2_grpc
from quiz_bank.infrastructure.mongo import QUESTION_BANK_DB, QUIZ_DB
from quiz_bank.questions.application.question_service import QuestionRepository, QuestionService
from quiz_bank.questions.grpc.question_servicer import QuestionServicer
from quiz_bank.questions.infrastructure.question_repository import MongoQuestionRepository
from quiz_bank.quizzes.application.quiz_service import QuizService
from quiz_bank.quizzes.domain.quiz import OptionSnapshot, QuestionSnapshot
from quiz_bank.quizzes.grpc.quiz_servicer import QuizServicer
from quiz_bank.quizzes.infrastructure.quiz_repository import MongoQuizRepository


class QuestionBankReader:
    """Adaptor: implementeaza QuestionReader peste repository-ul de intrebari."""

    def __init__(self, repository: QuestionRepository) -> None:
        self._repo = repository

    def read(self, question_id: str, owner_id: str) -> QuestionSnapshot | None:
        q = self._repo.get(question_id, owner_id)
        if q is None:
            return None
        return QuestionSnapshot(
            source_question_id=q.id or "",
            type=q.type.value,
            text=q.text,
            options=tuple(
                OptionSnapshot(id=o.id, text=o.text, is_correct=o.is_correct) for o in q.options
            ),
            difficulty=q.difficulty.value if q.difficulty else None,
            tags=tuple(q.tags),
        )


def register_services(client: MongoClient) -> Callable[[grpc.Server], None]:
    question_repo = MongoQuestionRepository(client[QUESTION_BANK_DB]["questions"])
    question_service = QuestionService(question_repo)

    quiz_repo = MongoQuizRepository(client[QUIZ_DB]["quizzes"])
    quiz_service = QuizService(quiz_repo, QuestionBankReader(question_repo))

    def register(server: grpc.Server) -> None:
        question_bank_pb2_grpc.add_QuestionServiceServicer_to_server(
            QuestionServicer(question_service), server
        )
        quiz_pb2_grpc.add_QuizServiceServicer_to_server(QuizServicer(quiz_service), server)

    return register