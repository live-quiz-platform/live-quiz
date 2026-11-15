import pytest

from quiz_bank.quizzes.domain.quiz import (
    OptionSnapshot,
    QuestionSnapshot,
    Quiz,
    QuizSettings,
)
from quiz_bank.shared.errors import ErrorCode, ValidationError

TIME_ERROR = "settings.time_per_question_seconds: trebuie sa fie intre 5 si 300"


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


def make(settings: QuizSettings | None = None) -> Quiz:
    return Quiz.create("u1", "Quiz", [snap()], settings)


def test_setarile_implicite():
    quiz = make()
    assert quiz.settings.time_per_question_seconds == 30
    assert quiz.settings.speed_bonus_enabled is False


@pytest.mark.parametrize("seconds", [5, 6, 30, 299, 300])
def test_timp_valid_la_creare(seconds):
    quiz = make(QuizSettings(time_per_question_seconds=seconds, speed_bonus_enabled=True))
    assert quiz.settings.time_per_question_seconds == seconds
    assert quiz.settings.speed_bonus_enabled is True


@pytest.mark.parametrize("seconds", [-1, 0, 4, 301, 1000])
def test_timp_invalid_la_creare(seconds):
    with pytest.raises(ValidationError) as exc:
        make(QuizSettings(time_per_question_seconds=seconds))
    assert exc.value.code == ErrorCode.VALIDATION
    assert TIME_ERROR in exc.value.errors


def test_erorile_de_titlu_si_setari_se_returneaza_impreuna():
    with pytest.raises(ValidationError) as exc:
        Quiz.create("u1", "", [snap()], QuizSettings(time_per_question_seconds=4))
    assert "title: nu poate fi gol" in exc.value.errors
    assert TIME_ERROR in exc.value.errors


@pytest.mark.parametrize("seconds", [5, 300])
def test_update_setari_valide(seconds):
    quiz = make()
    quiz.update_settings(QuizSettings(time_per_question_seconds=seconds, speed_bonus_enabled=True))
    assert quiz.settings.time_per_question_seconds == seconds
    assert quiz.settings.speed_bonus_enabled is True


@pytest.mark.parametrize("seconds", [4, 301])
def test_update_setari_invalide_nu_modifica_quiz_ul(seconds):
    quiz = make()
    with pytest.raises(ValidationError) as exc:
        quiz.update_settings(QuizSettings(time_per_question_seconds=seconds))
    assert TIME_ERROR in exc.value.errors
    assert quiz.settings.time_per_question_seconds == 30
    assert quiz.settings.speed_bonus_enabled is False