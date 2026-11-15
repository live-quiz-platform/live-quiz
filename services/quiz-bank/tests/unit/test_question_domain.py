import pytest

from quiz_bank.questions.domain.question import (
    Difficulty,
    OptionInput,
    Question,
    QuestionType,
)
from quiz_bank.shared.errors import ErrorCode, ValidationError


def opts(*pairs: tuple[str, bool]) -> list[OptionInput]:
    return [OptionInput(text=t, is_correct=c) for t, c in pairs]


def make_single(options=None, text="Cat face 2+2?", **kwargs) -> Question:
    if options is None:
        options = opts(("3", False), ("4", True), ("5", False))
    return Question.create(
        owner_id="u1",
        type=QuestionType.SINGLE_CHOICE,
        text=text,
        options=options,
        **kwargs,
    )


def errors_of(**kwargs) -> list[str]:
    with pytest.raises(ValidationError) as exc:
        make_single(**kwargs)
    assert exc.value.code == ErrorCode.VALIDATION
    return exc.value.errors


def test_intrebare_valida_se_creeaza():
    q = make_single(difficulty=Difficulty.EASY, tags=["mate", "baza"])
    assert q.owner_id == "u1"
    assert q.type == QuestionType.SINGLE_CHOICE
    assert q.text == "Cat face 2+2?"
    assert [o.text for o in q.options] == ["3", "4", "5"]
    assert [o.is_correct for o in q.options] == [False, True, False]
    assert q.difficulty == Difficulty.EASY
    assert q.tags == ["mate", "baza"]


def test_dificultatea_si_tagurile_sunt_optionale():
    q = make_single()
    assert q.difficulty is None
    assert q.tags == []


def test_id_urile_variantelor_sunt_generate_si_unice():
    q = make_single()
    ids = [o.id for o in q.options]
    assert all(ids)
    assert len(set(ids)) == len(ids)


def test_text_gol_este_invalid():
    assert "text: nu poate fi gol" in errors_of(text="")


def test_text_doar_spatii_este_invalid():
    assert "text: nu poate fi gol" in errors_of(text="   ")


def test_o_singura_varianta_este_invalida():
    errs = errors_of(options=opts(("a", True)))
    assert "options: trebuie sa existe intre 2 si 6 variante" in errs


def test_sapte_variante_este_invalid():
    options = opts(*[(str(i), i == 0) for i in range(7)])
    assert "options: trebuie sa existe intre 2 si 6 variante" in errors_of(options=options)


def test_doua_si_sase_variante_sunt_valide():
    assert len(make_single(options=opts(("a", True), ("b", False))).options) == 2
    six = opts(*[(str(i), i == 0) for i in range(6)])
    assert len(make_single(options=six).options) == 6


def test_zero_raspunsuri_corecte_este_invalid():
    errs = errors_of(options=opts(("a", False), ("b", False)))
    assert "options: trebuie sa existe exact un raspuns corect" in errs


def test_doua_raspunsuri_corecte_este_invalid():
    errs = errors_of(options=opts(("a", True), ("b", True), ("c", False)))
    assert "options: trebuie sa existe exact un raspuns corect" in errs


def test_variante_duplicate_ignorand_majusculele_si_spatiile():
    errs = errors_of(options=opts(("Da", True), ("  da ", False)))
    assert "options: variantele trebuie sa fie distincte" in errs


def test_duplicate_cu_spatii_interioare_multiple():
    errs = errors_of(options=opts(("a  b", True), ("A b", False)))
    assert "options: variantele trebuie sa fie distincte" in errs


def test_varianta_cu_text_gol_este_invalida():
    errs = errors_of(options=opts(("a", True), ("", False)))
    assert "options[1].text: nu poate fi gol" in errs


def test_se_returneaza_toate_erorile_nu_doar_prima():
    errs = errors_of(text="", options=opts(("a", False)))
    assert "text: nu poate fi gol" in errs
    assert "options: trebuie sa existe intre 2 si 6 variante" in errs
    assert "options: trebuie sa existe exact un raspuns corect" in errs
    assert len(errs) == 3


def test_tipul_nespecificat_este_invalid():
    with pytest.raises(ValidationError) as exc:
        Question.create(
            owner_id="u1",
            type=None,
            text="x",
            options=opts(("a", True), ("b", False)),
        )
    assert "type: este obligatoriu" in exc.value.errors


def test_true_false_genereaza_variantele_automat():
    q = Question.create(
        owner_id="u1",
        type=QuestionType.TRUE_FALSE,
        text="Cerul e albastru",
        options=opts(("orice", True), ("orice", False)),
    )
    assert [o.text for o in q.options] == ["Adevarat", "Fals"]
    assert [o.is_correct for o in q.options] == [True, False]


def test_true_false_cu_raspuns_fals():
    q = Question.create(
        owner_id="u1",
        type=QuestionType.TRUE_FALSE,
        text="x",
        options=opts(("", False), ("", True)),
    )
    assert [o.is_correct for o in q.options] == [False, True]


@pytest.mark.parametrize("n", [1, 3])
def test_true_false_cu_alt_numar_de_variante_este_invalid(n):
    options = opts(*[(str(i), i == 0) for i in range(n)])
    with pytest.raises(ValidationError) as exc:
        Question.create(
            owner_id="u1",
            type=QuestionType.TRUE_FALSE,
            text="x",
            options=options,
        )
    assert "options: adevarat/fals cere exact 2 variante" in exc.value.errors


def test_true_false_fara_raspuns_corect_este_invalid():
    with pytest.raises(ValidationError) as exc:
        Question.create(
            owner_id="u1",
            type=QuestionType.TRUE_FALSE,
            text="x",
            options=opts(("", False), ("", False)),
        )
    assert "options: trebuie sa existe exact un raspuns corect" in exc.value.errors


def test_update_inlocuieste_tot_continutul_editabil_inclusiv_tipul():
    q = make_single(difficulty=Difficulty.HARD, tags=["x"])
    created_at = q.created_at
    q.update(
        type=QuestionType.TRUE_FALSE,
        text="Pamantul e rotund",
        options=opts(("", True), ("", False)),
        difficulty=None,
        tags=[],
    )
    assert q.type == QuestionType.TRUE_FALSE
    assert q.text == "Pamantul e rotund"
    assert [o.text for o in q.options] == ["Adevarat", "Fals"]
    assert q.difficulty is None
    assert q.tags == []
    assert q.owner_id == "u1"
    assert q.created_at == created_at
    assert q.updated_at >= created_at


def test_update_invalid_nu_modifica_intrebarea():
    q = make_single()
    before_text = q.text
    before_options = list(q.options)
    with pytest.raises(ValidationError):
        q.update(
            type=QuestionType.SINGLE_CHOICE,
            text="",
            options=opts(("a", True), ("b", False)),
            difficulty=None,
            tags=[],
        )
    assert q.text == before_text
    assert q.options == before_options