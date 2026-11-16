import grpc
import pytest

from quiz_bank.generated.question_bank.v1 import question_bank_pb2 as pb
from quiz_bank.generated.question_bank.v1 import question_bank_pb2_grpc as pb_grpc
from tests.integration.conftest import teacher

pytestmark = pytest.mark.integration

U1 = teacher("u1")
U2 = teacher("u2")


@pytest.fixture
def stub(grpc_channel) -> pb_grpc.QuestionServiceStub:
    return pb_grpc.QuestionServiceStub(grpc_channel)


def valid_request(text: str = "2+2?") -> pb.CreateQuestionRequest:
    return pb.CreateQuestionRequest(
        type=pb.QUESTION_TYPE_SINGLE_CHOICE,
        text=text,
        options=[
            pb.AnswerOption(text="3"),
            pb.AnswerOption(text="4", is_correct=True),
        ],
        difficulty=pb.DIFFICULTY_EASY,
        tags=["mate"],
    )


def test_creeaza_si_citeste_intrebarea(stub):
    created = stub.CreateQuestion(valid_request(), metadata=U1).question
    assert created.id
    assert all(o.id for o in created.options)
    fetched = stub.GetQuestion(pb.GetQuestionRequest(id=created.id), metadata=U1).question
    assert fetched.text == "2+2?"
    assert fetched.difficulty == pb.DIFFICULTY_EASY
    assert list(fetched.tags) == ["mate"]


def test_intrebare_invalida_nu_se_salveaza_si_returneaza_toate_erorile(stub):
    bad = pb.CreateQuestionRequest(
        type=pb.QUESTION_TYPE_SINGLE_CHOICE,
        text="",
        options=[pb.AnswerOption(text="a")],
    )
    with pytest.raises(grpc.RpcError) as exc:
        stub.CreateQuestion(bad, metadata=U1)
    assert exc.value.code() == grpc.StatusCode.INVALID_ARGUMENT
    lines = exc.value.details().splitlines()
    assert "text: nu poate fi gol" in lines
    assert len(lines) == 3
    assert stub.ListQuestions(pb.ListQuestionsRequest(), metadata=U1).total == 0


def test_true_false_genereaza_variantele(stub):
    request = pb.CreateQuestionRequest(
        type=pb.QUESTION_TYPE_TRUE_FALSE,
        text="Cerul e albastru",
        options=[pb.AnswerOption(is_correct=True), pb.AnswerOption()],
    )
    q = stub.CreateQuestion(request, metadata=U1).question
    assert [o.text for o in q.options] == ["Adevarat", "Fals"]


def test_izolare_intre_profesori(stub):
    q = stub.CreateQuestion(valid_request(), metadata=U1).question
    for call, req in (
        (stub.GetQuestion, pb.GetQuestionRequest(id=q.id)),
        (stub.DeleteQuestion, pb.DeleteQuestionRequest(id=q.id)),
    ):
        with pytest.raises(grpc.RpcError) as exc:
            call(req, metadata=U2)
        assert exc.value.code() == grpc.StatusCode.NOT_FOUND
    update = pb.UpdateQuestionRequest(
        id=q.id,
        type=pb.QUESTION_TYPE_SINGLE_CHOICE,
        text="furat",
        options=[pb.AnswerOption(text="a"), pb.AnswerOption(text="b", is_correct=True)],
    )
    with pytest.raises(grpc.RpcError) as exc:
        stub.UpdateQuestion(update, metadata=U2)
    assert exc.value.code() == grpc.StatusCode.NOT_FOUND
    assert stub.ListQuestions(pb.ListQuestionsRequest(), metadata=U2).total == 0
    assert stub.GetQuestion(pb.GetQuestionRequest(id=q.id), metadata=U1).question.text == "2+2?"


def test_update_inlocuieste_continutul(stub):
    q = stub.CreateQuestion(valid_request(), metadata=U1).question
    update = pb.UpdateQuestionRequest(
        id=q.id,
        type=pb.QUESTION_TYPE_TRUE_FALSE,
        text="Pamantul e rotund",
        options=[pb.AnswerOption(is_correct=True), pb.AnswerOption()],
    )
    updated = stub.UpdateQuestion(update, metadata=U1).question
    assert updated.type == pb.QUESTION_TYPE_TRUE_FALSE
    assert updated.difficulty == pb.DIFFICULTY_UNSPECIFIED
    assert list(updated.tags) == []
    assert stub.GetQuestion(pb.GetQuestionRequest(id=q.id), metadata=U1).question.text == (
        "Pamantul e rotund"
    )


def test_delete_apoi_get_da_not_found(stub):
    q = stub.CreateQuestion(valid_request(), metadata=U1).question
    stub.DeleteQuestion(pb.DeleteQuestionRequest(id=q.id), metadata=U1)
    with pytest.raises(grpc.RpcError) as exc:
        stub.GetQuestion(pb.GetQuestionRequest(id=q.id), metadata=U1)
    assert exc.value.code() == grpc.StatusCode.NOT_FOUND


def test_id_invalid_da_not_found(stub):
    with pytest.raises(grpc.RpcError) as exc:
        stub.GetQuestion(pb.GetQuestionRequest(id="nu-e-objectid"), metadata=U1)
    assert exc.value.code() == grpc.StatusCode.NOT_FOUND


def test_list_cu_paginare_si_total(stub):
    for i in range(3):
        stub.CreateQuestion(valid_request(f"q{i}"), metadata=U1)
    stub.CreateQuestion(valid_request("altcineva"), metadata=U2)
    page1 = stub.ListQuestions(pb.ListQuestionsRequest(page=1, page_size=2), metadata=U1)
    page2 = stub.ListQuestions(pb.ListQuestionsRequest(page=2, page_size=2), metadata=U1)
    assert page1.total == 3
    assert [q.text for q in page1.questions] == ["q0", "q1"]
    assert [q.text for q in page2.questions] == ["q2"]