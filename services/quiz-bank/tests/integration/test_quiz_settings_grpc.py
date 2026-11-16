import grpc
import pytest

from quiz_bank.generated.question_bank.v1 import question_bank_pb2 as qpb
from quiz_bank.generated.question_bank.v1 import question_bank_pb2_grpc as qpb_grpc
from quiz_bank.generated.quiz.v1 import quiz_pb2 as pb
from quiz_bank.generated.quiz.v1 import quiz_pb2_grpc as pb_grpc
from tests.integration.conftest import teacher

pytestmark = pytest.mark.integration

U1 = teacher("u1")
U2 = teacher("u2")


@pytest.fixture
def quizzes(grpc_channel) -> pb_grpc.QuizServiceStub:
    return pb_grpc.QuizServiceStub(grpc_channel)


@pytest.fixture
def question_id(grpc_channel) -> str:
    stub = qpb_grpc.QuestionServiceStub(grpc_channel)
    request = qpb.CreateQuestionRequest(
        type=qpb.QUESTION_TYPE_SINGLE_CHOICE,
        text="q",
        options=[qpb.AnswerOption(text="a"), qpb.AnswerOption(text="b", is_correct=True)],
    )
    return stub.CreateQuestion(request, metadata=U1).question.id


def settings(seconds: int, bonus: bool = False) -> pb.QuizSettings:
    return pb.QuizSettings(time_per_question_seconds=seconds, speed_bonus_enabled=bonus)


@pytest.mark.parametrize("seconds", [5, 300])
def test_create_cu_timp_valid_salveaza_setarile(quizzes, question_id, seconds):
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(
            title="T", question_ids=[question_id], settings=settings(seconds, True)
        ),
        metadata=U1,
    ).quiz
    fetched = quizzes.GetQuiz(pb.GetQuizRequest(id=quiz.id), metadata=U1).quiz
    assert fetched.settings.time_per_question_seconds == seconds
    assert fetched.settings.speed_bonus_enabled is True


@pytest.mark.parametrize("seconds", [4, 301])
def test_create_cu_timp_invalid_nu_salveaza(quizzes, question_id, seconds):
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.CreateQuiz(
            pb.CreateQuizRequest(
                title="T", question_ids=[question_id], settings=settings(seconds)
            ),
            metadata=U1,
        )
    assert exc.value.code() == grpc.StatusCode.INVALID_ARGUMENT
    assert "settings.time_per_question_seconds" in exc.value.details()
    assert quizzes.ListQuizzes(pb.ListQuizzesRequest(), metadata=U1).total == 0


@pytest.mark.parametrize("seconds", [5, 300])
def test_update_setari_valide(quizzes, question_id, seconds):
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=[question_id]), metadata=U1
    ).quiz
    updated = quizzes.UpdateQuizSettings(
        pb.UpdateQuizSettingsRequest(quiz_id=quiz.id, settings=settings(seconds, True)),
        metadata=U1,
    ).quiz
    assert updated.settings.time_per_question_seconds == seconds
    fetched = quizzes.GetQuiz(pb.GetQuizRequest(id=quiz.id), metadata=U1).quiz
    assert fetched.settings.time_per_question_seconds == seconds
    assert fetched.settings.speed_bonus_enabled is True


@pytest.mark.parametrize("seconds", [0, 4, 301])
def test_update_setari_invalide_nu_modifica_quiz_ul(quizzes, question_id, seconds):
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=[question_id]), metadata=U1
    ).quiz
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.UpdateQuizSettings(
            pb.UpdateQuizSettingsRequest(quiz_id=quiz.id, settings=settings(seconds)),
            metadata=U1,
        )
    assert exc.value.code() == grpc.StatusCode.INVALID_ARGUMENT
    fetched = quizzes.GetQuiz(pb.GetQuizRequest(id=quiz.id), metadata=U1).quiz
    assert fetched.settings.time_per_question_seconds == 30


def test_update_fara_settings_este_invalid(quizzes, question_id):
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=[question_id]), metadata=U1
    ).quiz
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.UpdateQuizSettings(pb.UpdateQuizSettingsRequest(quiz_id=quiz.id), metadata=U1)
    assert exc.value.code() == grpc.StatusCode.INVALID_ARGUMENT


def test_update_setari_al_altui_profesor_este_not_found(quizzes, question_id):
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=[question_id]), metadata=U1
    ).quiz
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.UpdateQuizSettings(
            pb.UpdateQuizSettingsRequest(quiz_id=quiz.id, settings=settings(60)), metadata=U2
        )
    assert exc.value.code() == grpc.StatusCode.NOT_FOUND