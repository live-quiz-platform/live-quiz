from collections.abc import Callable

import grpc
from pymongo import MongoClient

from quiz_bank.generated.question_bank.v1 import question_bank_pb2_grpc
from quiz_bank.infrastructure.mongo import QUESTION_BANK_DB
from quiz_bank.questions.application.question_service import QuestionService
from quiz_bank.questions.grpc.question_servicer import QuestionServicer
from quiz_bank.questions.infrastructure.question_repository import MongoQuestionRepository


def register_services(client: MongoClient) -> Callable[[grpc.Server], None]:
    question_repo = MongoQuestionRepository(client[QUESTION_BANK_DB]["questions"])
    question_service = QuestionService(question_repo)

    def register(server: grpc.Server) -> None:
        question_bank_pb2_grpc.add_QuestionServiceServicer_to_server(
            QuestionServicer(question_service), server
        )

    return register