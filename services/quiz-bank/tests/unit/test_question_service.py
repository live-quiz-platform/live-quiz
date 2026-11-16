import pytest

from quiz_bank.questions.application.question_service import QuestionService
from quiz_bank.questions.domain.question import OptionInput, QuestionType
from quiz_bank.shared.errors import DomainError, ErrorCode, ValidationError

OPTIONS = [OptionInput("3", False), OptionInput("4", True)]


@pytest.fixture
def service(question_repo) -> QuestionService:
    return QuestionService(question_repo)


def create(service: QuestionService, owner: str = "u1", text: str = "2+2?"):
    return service.create(owner, QuestionType.SINGLE_CHOICE, text, OPTIONS)


def test_create_salveaza_si_da_id(service):
    q = create(service)
    assert q.id
    assert service.get("u1", q.id).text == "2+2?"


def test_create_invalid_nu_salveaza(service, question_repo):
    with pytest.raises(ValidationError):
        service.create("u1", QuestionType.SINGLE_CHOICE, "", OPTIONS)
    assert question_repo.items == {}


def test_get_al_altui_profesor_este_not_found(service):
    q = create(service, owner="u1")
    with pytest.raises(DomainError) as exc:
        service.get("u2", q.id)
    assert exc.value.code == ErrorCode.NOT_FOUND


def test_get_inexistent_este_not_found(service):
    with pytest.raises(DomainError) as exc:
        service.get("u1", "nu-exista")
    assert exc.value.code == ErrorCode.NOT_FOUND


def test_update_inlocuieste_continutul(service):
    q = create(service)
    updated = service.update(
        "u1", q.id, QuestionType.TRUE_FALSE, "Cer albastru?",
        [OptionInput("", True), OptionInput("", False)],
    )
    assert updated.type == QuestionType.TRUE_FALSE
    assert service.get("u1", q.id).text == "Cer albastru?"


def test_update_invalid_pastreaza_intrebarea(service):
    q = create(service)
    with pytest.raises(ValidationError):
        service.update("u1", q.id, QuestionType.SINGLE_CHOICE, "", OPTIONS)
    assert service.get("u1", q.id).text == "2+2?"


def test_update_al_altui_profesor_este_not_found(service):
    q = create(service, owner="u1")
    with pytest.raises(DomainError) as exc:
        service.update("u2", q.id, QuestionType.SINGLE_CHOICE, "x", OPTIONS)
    assert exc.value.code == ErrorCode.NOT_FOUND


def test_delete_sterge(service):
    q = create(service)
    service.delete("u1", q.id)
    with pytest.raises(DomainError):
        service.get("u1", q.id)


def test_delete_al_altui_profesor_este_not_found(service):
    q = create(service, owner="u1")
    with pytest.raises(DomainError) as exc:
        service.delete("u2", q.id)
    assert exc.value.code == ErrorCode.NOT_FOUND
    assert service.get("u1", q.id)


def test_list_doar_ale_profesorului_cu_total(service):
    for i in range(3):
        create(service, owner="u1", text=f"q{i}")
    create(service, owner="u2", text="altcineva")
    items, total = service.list("u1", page=1, page_size=2)
    assert total == 3
    assert [q.text for q in items] == ["q0", "q1"]
    items, _ = service.list("u1", page=2, page_size=2)
    assert [q.text for q in items] == ["q2"]


def test_list_normalizeaza_parametrii_invalizi(service):
    create(service)
    items, total = service.list("u1", page=0, page_size=0)
    assert total == 1
    assert len(items) == 1
    items, _ = service.list("u1", page=1, page_size=1000)
    assert len(items) == 1