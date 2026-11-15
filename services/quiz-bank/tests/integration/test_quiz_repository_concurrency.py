import pytest

from quiz_bank.infrastructure.mongo import QUIZ_DB
from quiz_bank.quizzes.domain.quiz import OptionSnapshot, QuestionSnapshot, Quiz
from quiz_bank.quizzes.infrastructure.quiz_repository import MongoQuizRepository
from quiz_bank.shared.errors import DomainError, ErrorCode

pytestmark = pytest.mark.integration


def snap(source_id: str = "q1") -> QuestionSnapshot:
    return QuestionSnapshot(
        source_question_id=source_id,
        type="SINGLE_CHOICE",
        text="t",
        options=(
            OptionSnapshot(id="o1", text="a", is_correct=True),
            OptionSnapshot(id="o2", text="b", is_correct=False),
        ),
        difficulty=None,
        tags=(),
    )


@pytest.fixture
def repo(mongo_client) -> MongoQuizRepository:
    return MongoQuizRepository(mongo_client[QUIZ_DB]["quizzes"])


@pytest.fixture
def created(repo) -> Quiz:
    return repo.add(Quiz.create("u1", "Initial", [snap()]))


def test_versiunea_porneste_de_la_0_si_creste_la_fiecare_salvare(repo, created):
    assert created.version == 0
    created.rename("A")
    repo.save(created)
    assert created.version == 1
    assert repo.get(created.id, "u1").version == 1


def test_salvari_succesive_pe_aceeasi_instanta_reusesc(repo, created):
    created.rename("A")
    repo.save(created)
    created.rename("B")
    repo.save(created)
    assert repo.get(created.id, "u1").title == "B"


def test_a_doua_salvare_pe_o_versiune_veche_este_conflict(repo, created):
    first = repo.get(created.id, "u1")
    second = repo.get(created.id, "u1")

    first.rename("Prima")
    repo.save(first)

    second.rename("A doua")
    with pytest.raises(DomainError) as exc:
        repo.save(second)

    assert exc.value.code == ErrorCode.CONFLICT
    assert repo.get(created.id, "u1").title == "Prima"


def test_save_pe_quiz_sters_este_not_found(repo, created):
    stale = repo.get(created.id, "u1")
    assert repo.delete(created.id, "u1")

    stale.rename("fantoma")
    with pytest.raises(DomainError) as exc:
        repo.save(stale)

    assert exc.value.code == ErrorCode.NOT_FOUND