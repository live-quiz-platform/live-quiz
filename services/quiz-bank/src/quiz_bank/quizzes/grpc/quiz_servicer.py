import grpc

from quiz_bank.generated.question_bank.v1 import question_bank_pb2 as qpb
from quiz_bank.generated.quiz.v1 import quiz_pb2 as pb
from quiz_bank.generated.quiz.v1 import quiz_pb2_grpc as pb_grpc
from quiz_bank.quizzes.application.quiz_service import QuizService
from quiz_bank.quizzes.domain.quiz import QuestionSnapshot, Quiz, QuizSettings
from quiz_bank.shared.auth import identity_from
from quiz_bank.shared.grpc_errors import translate_errors

TYPE_TO_PB = {
    "SINGLE_CHOICE": qpb.QUESTION_TYPE_SINGLE_CHOICE,
    "TRUE_FALSE": qpb.QUESTION_TYPE_TRUE_FALSE,
}
DIFFICULTY_TO_PB = {
    "EASY": qpb.DIFFICULTY_EASY,
    "MEDIUM": qpb.DIFFICULTY_MEDIUM,
    "HARD": qpb.DIFFICULTY_HARD,
}


def _question_to_pb(q: QuestionSnapshot) -> pb.QuizQuestion:
    return pb.QuizQuestion(
        position=q.position,
        source_question_id=q.source_question_id,
        type=TYPE_TO_PB[q.type],
        text=q.text,
        options=[
            qpb.AnswerOption(id=o.id, text=o.text, is_correct=o.is_correct) for o in q.options
        ],
        difficulty=DIFFICULTY_TO_PB.get(q.difficulty or "", qpb.DIFFICULTY_UNSPECIFIED),
        tags=list(q.tags),
    )


def quiz_to_pb(quiz: Quiz) -> pb.Quiz:
    return pb.Quiz(
        id=quiz.id or "",
        owner_id=quiz.owner_id,
        title=quiz.title,
        questions=[_question_to_pb(q) for q in quiz.questions],
        settings=pb.QuizSettings(
            time_per_question_seconds=quiz.settings.time_per_question_seconds,
            speed_bonus_enabled=quiz.settings.speed_bonus_enabled,
        ),
        created_at=quiz.created_at.isoformat(),
        updated_at=quiz.updated_at.isoformat(),
    )


def settings_from_pb(settings: pb.QuizSettings) -> QuizSettings:
    return QuizSettings(
        time_per_question_seconds=settings.time_per_question_seconds,
        speed_bonus_enabled=settings.speed_bonus_enabled,
    )


class QuizServicer(pb_grpc.QuizServiceServicer):
    def __init__(self, service: QuizService) -> None:
        self._service = service

    @translate_errors
    def CreateQuiz(self, request, context: grpc.ServicerContext):
        settings = settings_from_pb(request.settings) if request.HasField("settings") else None
        quiz = self._service.create(
            identity_from(context).user_id,
            request.title,
            list(request.question_ids),
            settings,
        )
        return pb.CreateQuizResponse(quiz=quiz_to_pb(quiz))

    @translate_errors
    def GetQuiz(self, request, context: grpc.ServicerContext):
        quiz = self._service.get(identity_from(context).user_id, request.id)
        return pb.GetQuizResponse(quiz=quiz_to_pb(quiz))

    @translate_errors
    def ListQuizzes(self, request, context: grpc.ServicerContext):
        quizzes, total = self._service.list(
            identity_from(context).user_id, request.page, request.page_size
        )
        return pb.ListQuizzesResponse(quizzes=[quiz_to_pb(q) for q in quizzes], total=total)

    @translate_errors
    def UpdateQuizTitle(self, request, context: grpc.ServicerContext):
        quiz = self._service.update_title(identity_from(context).user_id, request.id, request.title)
        return pb.UpdateQuizTitleResponse(quiz=quiz_to_pb(quiz))

    @translate_errors
    def AddQuestionToQuiz(self, request, context: grpc.ServicerContext):
        quiz = self._service.add_question(
            identity_from(context).user_id, request.quiz_id, request.question_id
        )
        return pb.AddQuestionToQuizResponse(quiz=quiz_to_pb(quiz))

    @translate_errors
    def RemoveQuestionFromQuiz(self, request, context: grpc.ServicerContext):
        quiz = self._service.remove_question(
            identity_from(context).user_id, request.quiz_id, request.question_id
        )
        return pb.RemoveQuestionFromQuizResponse(quiz=quiz_to_pb(quiz))

    @translate_errors
    def ReorderQuizQuestions(self, request, context: grpc.ServicerContext):
        quiz = self._service.reorder(
            identity_from(context).user_id, request.quiz_id, list(request.question_ids)
        )
        return pb.ReorderQuizQuestionsResponse(quiz=quiz_to_pb(quiz))

    @translate_errors
    def DeleteQuiz(self, request, context: grpc.ServicerContext):
        self._service.delete(identity_from(context).user_id, request.id)
        return pb.DeleteQuizResponse()