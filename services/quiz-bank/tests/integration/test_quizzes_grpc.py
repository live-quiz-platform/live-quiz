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
def questions(grpc_channel) -> qpb_grpc.QuestionServiceStub:
    return qpb_grpc.QuestionServiceStub(grpc_channel)


@pytest.fixture
def quizzes(grpc_channel) -> pb_grpc.QuizServiceStub:
    return pb_grpc.QuizServiceStub(grpc_channel)


def new_question(questions, text: str, metadata=U1) -> str:
    request = qpb.CreateQuestionRequest(
        type=qpb.QUESTION_TYPE_SINGLE_CHOICE,
        text=text,
        options=[qpb.AnswerOption(text="a"), qpb.AnswerOption(text="b", is_correct=True)],
    )
    return questions.CreateQuestion(request, metadata=metadata).question.id


def order(quiz) -> list[str]:
    return [q.source_question_id for q in quiz.questions]


def test_creeaza_quiz_cu_snapshot_si_setari_implicite(questions, quizzes):
    q1 = new_question(questions, "intrebarea 1")
    q2 = new_question(questions, "intrebarea 2")
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="Seminar 1", question_ids=[q1, q2]), metadata=U1
    ).quiz
    assert quiz.id
    assert quiz.title == "Seminar 1"
    assert order(quiz) == [q1, q2]
    assert [q.position for q in quiz.questions] == [1, 2]
    assert quiz.questions[0].text == "intrebarea 1"
    assert quiz.settings.time_per_question_seconds == 30
    assert quiz.settings.speed_bonus_enabled is False


def test_snapshot_ramane_neschimbat_dupa_modificarea_si_stergerea_intrebarii(
    questions, quizzes
):
    qid = new_question(questions, "original")
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=[qid]), metadata=U1
    ).quiz

    questions.UpdateQuestion(
        qpb.UpdateQuestionRequest(
            id=qid,
            type=qpb.QUESTION_TYPE_SINGLE_CHOICE,
            text="MODIFICAT",
            options=[qpb.AnswerOption(text="x"), qpb.AnswerOption(text="y", is_correct=True)],
        ),
        metadata=U1,
    )
    after_update = quizzes.GetQuiz(pb.GetQuizRequest(id=quiz.id), metadata=U1).quiz
    assert after_update.questions[0].text == "original"
    assert [o.text for o in after_update.questions[0].options] == ["a", "b"]

    questions.DeleteQuestion(qpb.DeleteQuestionRequest(id=qid), metadata=U1)
    after_delete = quizzes.GetQuiz(pb.GetQuizRequest(id=quiz.id), metadata=U1).quiz
    assert after_delete.questions[0].text == "original"
    assert after_delete.questions[0].source_question_id == qid


def test_duplicat_la_creare_este_already_exists(questions, quizzes):
    qid = new_question(questions, "q")
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.CreateQuiz(pb.CreateQuizRequest(title="T", question_ids=[qid, qid]), metadata=U1)
    assert exc.value.code() == grpc.StatusCode.ALREADY_EXISTS
    assert quizzes.ListQuizzes(pb.ListQuizzesRequest(), metadata=U1).total == 0


def test_adaugare_duplicat_este_already_exists(questions, quizzes):
    qid = new_question(questions, "q")
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=[qid]), metadata=U1
    ).quiz
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.AddQuestionToQuiz(
            pb.AddQuestionToQuizRequest(quiz_id=quiz.id, question_id=qid), metadata=U1
        )
    assert exc.value.code() == grpc.StatusCode.ALREADY_EXISTS


def test_add_remove_si_ultima_intrebare(questions, quizzes):
    q1 = new_question(questions, "q1")
    q2 = new_question(questions, "q2")
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=[q1]), metadata=U1
    ).quiz
    added = quizzes.AddQuestionToQuiz(
        pb.AddQuestionToQuizRequest(quiz_id=quiz.id, question_id=q2), metadata=U1
    ).quiz
    assert order(added) == [q1, q2]
    removed = quizzes.RemoveQuestionFromQuiz(
        pb.RemoveQuestionFromQuizRequest(quiz_id=quiz.id, question_id=q1), metadata=U1
    ).quiz
    assert order(removed) == [q2]
    assert removed.questions[0].position == 1
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.RemoveQuestionFromQuiz(
            pb.RemoveQuestionFromQuizRequest(quiz_id=quiz.id, question_id=q2), metadata=U1
        )
    assert exc.value.code() == grpc.StatusCode.FAILED_PRECONDITION


def test_reordonare_valida_si_invalida(questions, quizzes):
    ids = [new_question(questions, f"q{i}") for i in range(3)]
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=ids), metadata=U1
    ).quiz
    new_order = [ids[2], ids[0], ids[1]]
    reordered = quizzes.ReorderQuizQuestions(
        pb.ReorderQuizQuestionsRequest(quiz_id=quiz.id, question_ids=new_order), metadata=U1
    ).quiz
    assert order(reordered) == new_order
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.ReorderQuizQuestions(
            pb.ReorderQuizQuestionsRequest(quiz_id=quiz.id, question_ids=ids[:2]), metadata=U1
        )
    assert exc.value.code() == grpc.StatusCode.INVALID_ARGUMENT
    current = quizzes.GetQuiz(pb.GetQuizRequest(id=quiz.id), metadata=U1).quiz
    assert order(current) == new_order


def test_quiz_fara_intrebari_sau_fara_titlu_este_invalid(questions, quizzes):
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.CreateQuiz(pb.CreateQuizRequest(title="", question_ids=[]), metadata=U1)
    assert exc.value.code() == grpc.StatusCode.INVALID_ARGUMENT
    assert len(exc.value.details().splitlines()) == 2


def test_intrebare_inexistenta_sau_a_altui_profesor_este_not_found(questions, quizzes):
    foreign = new_question(questions, "a lui u2", metadata=U2)
    for qid in (foreign, "nu-e-objectid"):
        with pytest.raises(grpc.RpcError) as exc:
            quizzes.CreateQuiz(pb.CreateQuizRequest(title="T", question_ids=[qid]), metadata=U1)
        assert exc.value.code() == grpc.StatusCode.NOT_FOUND


def test_izolare_intre_profesori(questions, quizzes):
    qid = new_question(questions, "q")
    quiz = quizzes.CreateQuiz(
        pb.CreateQuizRequest(title="T", question_ids=[qid]), metadata=U1
    ).quiz
    calls = [
        (quizzes.GetQuiz, pb.GetQuizRequest(id=quiz.id)),
        (quizzes.DeleteQuiz, pb.DeleteQuizRequest(id=quiz.id)),
        (quizzes.UpdateQuizTitle, pb.UpdateQuizTitleRequest(id=quiz.id, title="furat")),
        (
            quizzes.RemoveQuestionFromQuiz,
            pb.RemoveQuestionFromQuizRequest(quiz_id=quiz.id, question_id=qid),
        ),
    ]
    for call, request in calls:
        with pytest.raises(grpc.RpcError) as exc:
            call(request, metadata=U2)
        assert exc.value.code() == grpc.StatusCode.NOT_FOUND
    assert quizzes.ListQuizzes(pb.ListQuizzesRequest(), metadata=U2).total == 0
    assert quizzes.GetQuiz(pb.GetQuizRequest(id=quiz.id), metadata=U1).quiz.title == "T"


def test_titlu_list_si_delete(questions, quizzes):
    qid = new_question(questions, "q")
    for title in ("A", "B", "C"):
        quizzes.CreateQuiz(pb.CreateQuizRequest(title=title, question_ids=[qid]), metadata=U1)
    page1 = quizzes.ListQuizzes(pb.ListQuizzesRequest(page=1, page_size=2), metadata=U1)
    page2 = quizzes.ListQuizzes(pb.ListQuizzesRequest(page=2, page_size=2), metadata=U1)
    assert page1.total == 3
    assert [q.title for q in page1.quizzes] == ["A", "B"]
    assert [q.title for q in page2.quizzes] == ["C"]

    target = page1.quizzes[0]
    renamed = quizzes.UpdateQuizTitle(
        pb.UpdateQuizTitleRequest(id=target.id, title="Nou"), metadata=U1
    ).quiz
    assert renamed.title == "Nou"
    quizzes.DeleteQuiz(pb.DeleteQuizRequest(id=target.id), metadata=U1)
    with pytest.raises(grpc.RpcError) as exc:
        quizzes.GetQuiz(pb.GetQuizRequest(id=target.id), metadata=U1)
    assert exc.value.code() == grpc.StatusCode.NOT_FOUND