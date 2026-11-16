import pytest

from quiz_bank.infrastructure.mongo import QUESTION_BANK_DB
from quiz_bank.questions.domain.question import OptionInput, Question, QuestionType
from quiz_bank.questions.infrastructure.question_repository import MongoQuestionRepository
from quiz_bank.shared.errors import DomainError, ErrorCode

pytestmark = pytest.mark.integration

OPTIONS = [OptionInput("3", False), OptionInput("4", True)]


def new_question() -> Question:
    return Question.create("u1", QuestionType.SINGLE_CHOICE, "2+2?", OPTIONS)


def edit(question: Question, text: str) -> None:
    question.update(QuestionType.SINGLE_CHOICE, text, OPTIONS)


@pytest.fixture
def repo(mongo_client) -> MongoQuestionRepository:
    return MongoQuestionRepository(mongo_client[QUESTION_BANK_DB]["questions"])


@pytest.fixture
def created(repo) -> Question:
    return repo.add(new_question())


def test_versiunea_porneste_de_la_0_si_creste_la_fiecare_salvare(repo, created):
    assert created.version == 0
    edit(created, "A")
    repo.save(created)
    assert created.version == 1
    assert repo.get(created.id, "u1").version == 1


def test_salvari_succesive_pe_aceeasi_instanta_reusesc(repo, created):
    edit(created, "A")
    repo.save(created)
    edit(created, "B")
    repo.save(created)
    assert repo.get(created.id, "u1").text == "B"


def test_a_doua_salvare_pe_o_versiune_veche_este_conflict(repo, created):
    first = repo.get(created.id, "u1")
    second = repo.get(created.id, "u1")

    edit(first, "Prima")
    repo.save(first)

    edit(second, "A doua")
    with pytest.raises(DomainError) as exc:
        repo.save(second)

    assert exc.value.code == ErrorCode.CONFLICT
    assert repo.get(created.id, "u1").text == "Prima"


def test_save_pe_intrebare_stearsa_este_not_found(repo, created):
    stale = repo.get(created.id, "u1")
    assert repo.delete(created.id, "u1")

    edit(stale, "fantoma")
    with pytest.raises(DomainError) as exc:
        repo.save(stale)

    assert exc.value.code == ErrorCode.NOT_FOUND