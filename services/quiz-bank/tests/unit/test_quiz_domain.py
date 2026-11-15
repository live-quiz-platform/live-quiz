import pytest

from quiz_bank.quizzes.domain.quiz import (
    OptionSnapshot,
    QuestionSnapshot,
    Quiz,
)
from quiz_bank.shared.errors import DomainError, ErrorCode, ValidationError


def snap(source_id: str, text: str = "t") -> QuestionSnapshot:
    return QuestionSnapshot(
        source_question_id=source_id,
        type="SINGLE_CHOICE",
        text=text,
        options=(
            OptionSnapshot(id="o1", text="a", is_correct=True),
            OptionSnapshot(id="o2", text="b", is_correct=False),
        ),
        difficulty=None,
        tags=(),
    )


def make(ids=("q1", "q2", "q3"), title="Quiz 1") -> Quiz:
    return Quiz.create("u1", title, [snap(i) for i in ids])


def order(quiz: Quiz) -> list[str]:
    return [q.source_question_id for q in quiz.questions]


def test_quiz_valid_se_creeaza_cu_pozitii_de_la_1():
    quiz = make()
    assert quiz.title == "Quiz 1"
    assert quiz.owner_id == "u1"
    assert [q.position for q in quiz.questions] == [1, 2, 3]
    assert order(quiz) == ["q1", "q2", "q3"]


def test_titlu_gol_este_invalid():
    with pytest.raises(ValidationError) as exc:
        make(title="   ")
    assert "title: nu poate fi gol" in exc.value.errors


def test_fara_intrebari_este_invalid():
    with pytest.raises(ValidationError) as exc:
        Quiz.create("u1", "T", [])
    assert "questions: trebuie sa existe cel putin o intrebare" in exc.value.errors


def test_se_returneaza_toate_erorile():
    with pytest.raises(ValidationError) as exc:
        Quiz.create("u1", "", [])
    assert len(exc.value.errors) == 2


def test_duplicat_la_creare_este_already_exists():
    with pytest.raises(DomainError) as exc:
        Quiz.create("u1", "T", [snap("q1"), snap("q1")])
    assert exc.value.code == ErrorCode.ALREADY_EXISTS


def test_setari_implicite():
    quiz = make()
    assert quiz.settings.time_per_question_seconds == 30
    assert quiz.settings.speed_bonus_enabled is False


def test_snapshot_este_imutabil():
    quiz = make()
    with pytest.raises(AttributeError):
        quiz.questions[0].text = "altceva"  # type: ignore[misc]


def test_adauga_intrebare_la_final():
    quiz = make(("q1",))
    quiz.add_question(snap("q2"))
    assert order(quiz) == ["q1", "q2"]
    assert [q.position for q in quiz.questions] == [1, 2]


def test_adauga_aceeasi_intrebare_de_doua_ori_este_already_exists():
    quiz = make(("q1",))
    with pytest.raises(DomainError) as exc:
        quiz.add_question(snap("q1", text="alt text"))
    assert exc.value.code == ErrorCode.ALREADY_EXISTS
    assert order(quiz) == ["q1"]


def test_sterge_intrebare_renumeroteaza():
    quiz = make()
    quiz.remove_question("q2")
    assert order(quiz) == ["q1", "q3"]
    assert [q.position for q in quiz.questions] == [1, 2]


def test_sterge_ultima_intrebare_este_failed_precondition():
    quiz = make(("q1",))
    with pytest.raises(DomainError) as exc:
        quiz.remove_question("q1")
    assert exc.value.code == ErrorCode.FAILED_PRECONDITION
    assert order(quiz) == ["q1"]


def test_sterge_intrebare_inexistenta_este_not_found():
    quiz = make()
    with pytest.raises(DomainError) as exc:
        quiz.remove_question("zzz")
    assert exc.value.code == ErrorCode.NOT_FOUND


def test_reordonare_valida():
    quiz = make()
    quiz.reorder(["q3", "q1", "q2"])
    assert order(quiz) == ["q3", "q1", "q2"]
    assert [q.position for q in quiz.questions] == [1, 2, 3]


@pytest.mark.parametrize(
    "ids",
    [
        ["q1", "q2"],
        ["q1", "q2", "q3", "q4"],
        ["q1", "q1", "q2"],
        ["q1", "q2", "zzz"],
        [],
    ],
)
def test_reordonare_care_nu_e_permutare_este_invalida(ids):
    quiz = make()
    with pytest.raises(ValidationError) as exc:
        quiz.reorder(ids)
    assert "question_ids: trebuie sa fie o permutare a intrebarilor curente" in exc.value.errors
    assert order(quiz) == ["q1", "q2", "q3"]


def test_schimbare_titlu():
    quiz = make()
    quiz.rename("Nou")
    assert quiz.title == "Nou"


def test_schimbare_titlu_gol_este_invalida():
    quiz = make()
    with pytest.raises(ValidationError):
        quiz.rename("")
    assert quiz.title == "Quiz 1"