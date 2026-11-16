from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.collection import Collection

from quiz_bank.quizzes.domain.quiz import (
    OptionSnapshot,
    QuestionSnapshot,
    Quiz,
    QuizSettings,
)
from quiz_bank.shared.errors import conflict, not_found


def _oid(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def _question_to_document(q: QuestionSnapshot) -> dict[str, Any]:
    return {
        "position": q.position,
        "sourceQuestionId": q.source_question_id,
        "snapshot": {
            "type": q.type,
            "text": q.text,
            "options": [
                {"id": o.id, "text": o.text, "isCorrect": o.is_correct} for o in q.options
            ],
            "difficulty": q.difficulty,
            "tags": list(q.tags),
        },
    }


def _question_from_document(doc: dict[str, Any]) -> QuestionSnapshot:
    snap = doc["snapshot"]
    return QuestionSnapshot(
        source_question_id=doc["sourceQuestionId"],
        type=snap["type"],
        text=snap["text"],
        options=tuple(
            OptionSnapshot(id=o["id"], text=o["text"], is_correct=o["isCorrect"])
            for o in snap["options"]
        ),
        difficulty=snap.get("difficulty"),
        tags=tuple(snap.get("tags", [])),
        position=doc["position"],
    )


def _to_document(quiz: Quiz, version: int) -> dict[str, Any]:
    return {
        "ownerId": quiz.owner_id,
        "title": quiz.title,
        "questions": [_question_to_document(q) for q in quiz.questions],
        "settings": {
            "timePerQuestionSeconds": quiz.settings.time_per_question_seconds,
            "speedBonusEnabled": quiz.settings.speed_bonus_enabled,
        },
        "createdAt": quiz.created_at,
        "updatedAt": quiz.updated_at,
        "version": version,
    }


def _from_document(doc: dict[str, Any]) -> Quiz:
    settings = doc["settings"]
    return Quiz(
        id=str(doc["_id"]),
        owner_id=doc["ownerId"],
        title=doc["title"],
        questions=[_question_from_document(q) for q in doc["questions"]],
        settings=QuizSettings(
            time_per_question_seconds=settings["timePerQuestionSeconds"],
            speed_bonus_enabled=settings["speedBonusEnabled"],
        ),
        created_at=doc["createdAt"],
        updated_at=doc["updatedAt"],
        version=doc.get("version", 0),
    )


class MongoQuizRepository:
    def __init__(self, collection: Collection) -> None:
        self._col = collection

    def add(self, quiz: Quiz) -> Quiz:
        quiz.version = 0
        result = self._col.insert_one(_to_document(quiz, quiz.version))
        quiz.id = str(result.inserted_id)
        return quiz

    def get(self, quiz_id: str, owner_id: str) -> Quiz | None:
        oid = _oid(quiz_id)
        if oid is None:
            return None
        doc = self._col.find_one({"_id": oid, "ownerId": owner_id})
        return _from_document(doc) if doc else None

    def save(self, quiz: Quiz) -> None:
        oid = _oid(quiz.id or "")
        if oid is None:
            raise not_found("quiz-ul nu exista")
        result = self._col.replace_one(
            {"_id": oid, "ownerId": quiz.owner_id, "version": quiz.version},
            _to_document(quiz, quiz.version + 1),
        )
        if result.matched_count == 1:
            quiz.version += 1
            return
        if self._col.count_documents({"_id": oid, "ownerId": quiz.owner_id}, limit=1) == 0:
            raise not_found("quiz-ul nu exista")
        raise conflict("quiz-ul a fost modificat intre timp, reincarca si reincearca")

    def delete(self, quiz_id: str, owner_id: str) -> bool:
        oid = _oid(quiz_id)
        if oid is None:
            return False
        result = self._col.delete_one({"_id": oid, "ownerId": owner_id})
        return result.deleted_count == 1

    def list(self, owner_id: str, skip: int, limit: int) -> tuple[list[Quiz], int]:
        query = {"ownerId": owner_id}
        total = self._col.count_documents(query)
        cursor = self._col.find(query).sort("_id", 1).skip(skip).limit(limit)
        return [_from_document(d) for d in cursor], total