import pytest

from quiz_bank.quizzes.application.quiz_service import QuizService
from quiz_bank.shared.errors import DomainError, ErrorCode, ValidationError


@pytest.fixture
def service(quiz_repo, question_reader) -> QuizService:
    return QuizService(quiz_repo, question_reader)


def order(quiz) -> list[str]:
    return [q.source_question_id for q in quiz.questions]


def code_of(exc: pytest.ExceptionInfo) -> ErrorCode:
    return exc.value.code


def test_create_salveaza_cu_snapshot(service):
    quiz = service.create("u1", "Quiz", ["q1", "q2"])
    assert quiz.id
    assert order(service.get("u1", quiz.id)) == ["q1", "q2"]


def test_create_cu_intrebare_inexistenta_este_not_found(service, quiz_repo):
    with pytest.raises(DomainError) as exc:
        service.create("u1", "Quiz", ["q1", "zzz"])
    assert code_of(exc) == ErrorCode.NOT_FOUND
    assert quiz_repo.items == {}


def test_create_cu_intrebarea_altui_profesor_este_not_found(service):
    with pytest.raises(DomainError) as exc:
        service.create("u1", "Quiz", ["x1"])
    assert code_of(exc) == ErrorCode.NOT_FOUND


def test_create_cu_duplicat_este_already_exists(service, quiz_repo):
    with pytest.raises(DomainError) as exc:
        service.create("u1", "Quiz", ["q1", "q1"])
    assert code_of(exc) == ErrorCode.ALREADY_EXISTS
    assert quiz_repo.items == {}


def test_create_fara_intrebari_este_invalid(service):
    with pytest.raises(ValidationError):
        service.create("u1", "Quiz", [])


def test_create_cu_titlu_gol_este_invalid(service):
    with pytest.raises(ValidationError):
        service.create("u1", "", ["q1"])


def test_get_al_altui_profesor_este_not_found(service):
    quiz = service.create("u1", "Quiz", ["q1"])
    with pytest.raises(DomainError) as exc:
        service.get("u2", quiz.id)
    assert code_of(exc) == ErrorCode.NOT_FOUND


def test_snapshot_nu_e_afectat_de_modificarea_intrebarii_sursa(service, question_reader):
    quiz = service.create("u1", "Quiz", ["q1"])
    question_reader.add("q1", "u1", text="MODIFICAT")
    question_reader.items.pop(("q1", "u1"))
    assert service.get("u1", quiz.id).questions[0].text == "t"


def test_add_question(service):
    quiz = service.create("u1", "Quiz", ["q1"])
    updated = service.add_question("u1", quiz.id, "q2")
    assert order(updated) == ["q1", "q2"]
    assert order(service.get("u1", quiz.id)) == ["q1", "q2"]


def test_add_question_duplicat_este_already_exists(service):
    quiz = service.create("u1", "Quiz", ["q1"])
    with pytest.raises(DomainError) as exc:
        service.add_question("u1", quiz.id, "q1")
    assert code_of(exc) == ErrorCode.ALREADY_EXISTS


def test_add_question_inexistenta_este_not_found(service):
    quiz = service.create("u1", "Quiz", ["q1"])
    with pytest.raises(DomainError) as exc:
        service.add_question("u1", quiz.id, "x1")
    assert code_of(exc) == ErrorCode.NOT_FOUND


def test_remove_question(service):
    quiz = service.create("u1", "Quiz", ["q1", "q2"])
    updated = service.remove_question("u1", quiz.id, "q1")
    assert order(updated) == ["q2"]
    assert updated.questions[0].position == 1


def test_remove_ultima_intrebare_este_failed_precondition(service):
    quiz = service.create("u1", "Quiz", ["q1"])
    with pytest.raises(DomainError) as exc:
        service.remove_question("u1", quiz.id, "q1")
    assert code_of(exc) == ErrorCode.FAILED_PRECONDITION
    assert order(service.get("u1", quiz.id)) == ["q1"]


def test_reorder(service):
    quiz = service.create("u1", "Quiz", ["q1", "q2", "q3"])
    service.reorder("u1", quiz.id, ["q3", "q1", "q2"])
    assert order(service.get("u1", quiz.id)) == ["q3", "q1", "q2"]


def test_reorder_invalid_este_validation(service):
    quiz = service.create("u1", "Quiz", ["q1", "q2"])
    with pytest.raises(ValidationError):
        service.reorder("u1", quiz.id, ["q1"])
    assert order(service.get("u1", quiz.id)) == ["q1", "q2"]


def test_update_title(service):
    quiz = service.create("u1", "Vechi", ["q1"])
    service.update_title("u1", quiz.id, "Nou")
    assert service.get("u1", quiz.id).title == "Nou"


def test_operatiile_altui_profesor_sunt_not_found(service):
    quiz = service.create("u1", "Quiz", ["q1"])
    calls = [
        lambda: service.update_title("u2", quiz.id, "x"),
        lambda: service.add_question("u2", quiz.id, "x1"),
        lambda: service.remove_question("u2", quiz.id, "q1"),
        lambda: service.reorder("u2", quiz.id, ["q1"]),
        lambda: service.delete("u2", quiz.id),
    ]
    for call in calls:
        with pytest.raises(DomainError) as exc:
            call()
        assert code_of(exc) == ErrorCode.NOT_FOUND


def test_delete(service):
    quiz = service.create("u1", "Quiz", ["q1"])
    service.delete("u1", quiz.id)
    with pytest.raises(DomainError):
        service.get("u1", quiz.id)


def test_list_cu_paginare_si_izolare(service):
    for i in range(3):
        service.create("u1", f"Q{i}", ["q1"])
    service.create("u2", "Altul", ["x1"])
    items, total = service.list("u1", page=1, page_size=2)
    assert total == 3
    assert [q.title for q in items] == ["Q0", "Q1"]
    items, _ = service.list("u1", page=2, page_size=2)
    assert [q.title for q in items] == ["Q2"]