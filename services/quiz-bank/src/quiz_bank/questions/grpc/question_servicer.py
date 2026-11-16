import grpc

from quiz_bank.generated.question_bank.v1 import question_bank_pb2 as pb
from quiz_bank.generated.question_bank.v1 import question_bank_pb2_grpc as pb_grpc
from quiz_bank.questions.application.question_service import QuestionService
from quiz_bank.questions.domain.question import (
    Difficulty,
    OptionInput,
    Question,
    QuestionType,
)
from quiz_bank.shared.auth import identity_from
from quiz_bank.shared.grpc_errors import translate_errors

TYPE_FROM_PB = {
    pb.QUESTION_TYPE_SINGLE_CHOICE: QuestionType.SINGLE_CHOICE,
    pb.QUESTION_TYPE_TRUE_FALSE: QuestionType.TRUE_FALSE,
}
TYPE_TO_PB = {v: k for k, v in TYPE_FROM_PB.items()}

DIFFICULTY_FROM_PB = {
    pb.DIFFICULTY_EASY: Difficulty.EASY,
    pb.DIFFICULTY_MEDIUM: Difficulty.MEDIUM,
    pb.DIFFICULTY_HARD: Difficulty.HARD,
}
DIFFICULTY_TO_PB = {v: k for k, v in DIFFICULTY_FROM_PB.items()}


def options_from_pb(options) -> list[OptionInput]:
    return [OptionInput(text=o.text, is_correct=o.is_correct) for o in options]


def question_to_pb(q: Question) -> pb.Question:
    return pb.Question(
        id=q.id or "",
        owner_id=q.owner_id,
        type=TYPE_TO_PB[q.type],
        text=q.text,
        options=[
            pb.AnswerOption(id=o.id, text=o.text, is_correct=o.is_correct) for o in q.options
        ],
        difficulty=DIFFICULTY_TO_PB[q.difficulty] if q.difficulty else pb.DIFFICULTY_UNSPECIFIED,
        tags=q.tags,
        created_at=q.created_at.isoformat(),
        updated_at=q.updated_at.isoformat(),
    )


class QuestionServicer(pb_grpc.QuestionServiceServicer):
    def __init__(self, service: QuestionService) -> None:
        self._service = service

    @translate_errors
    def CreateQuestion(self, request, context: grpc.ServicerContext):
        question = self._service.create(
            owner_id=identity_from(context).user_id,
            type=TYPE_FROM_PB.get(request.type),
            text=request.text,
            options=options_from_pb(request.options),
            difficulty=DIFFICULTY_FROM_PB.get(request.difficulty),
            tags=list(request.tags),
        )
        return pb.CreateQuestionResponse(question=question_to_pb(question))

    @translate_errors
    def UpdateQuestion(self, request, context: grpc.ServicerContext):
        question = self._service.update(
            owner_id=identity_from(context).user_id,
            question_id=request.id,
            type=TYPE_FROM_PB.get(request.type),
            text=request.text,
            options=options_from_pb(request.options),
            difficulty=DIFFICULTY_FROM_PB.get(request.difficulty),
            tags=list(request.tags),
        )
        return pb.UpdateQuestionResponse(question=question_to_pb(question))

    @translate_errors
    def DeleteQuestion(self, request, context: grpc.ServicerContext):
        self._service.delete(identity_from(context).user_id, request.id)
        return pb.DeleteQuestionResponse()

    @translate_errors
    def GetQuestion(self, request, context: grpc.ServicerContext):
        question = self._service.get(identity_from(context).user_id, request.id)
        return pb.GetQuestionResponse(question=question_to_pb(question))

    @translate_errors
    def ListQuestions(self, request, context: grpc.ServicerContext):
        questions, total = self._service.list(
            identity_from(context).user_id, request.page, request.page_size
        )
        return pb.ListQuestionsResponse(
            questions=[question_to_pb(q) for q in questions], total=total
        )