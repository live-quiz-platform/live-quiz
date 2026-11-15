from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.collection import Collection

from quiz_bank.questions.domain.question import (
    AnswerOption,
    Difficulty,
    Question,
    QuestionType,
)


def _oid(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def _to_document(question: Question) -> dict[str, Any]:
    return {
        "ownerId": question.owner_id,
        "type": question.type.value,
        "text": question.text,
        "options": [
            {"id": o.id, "text": o.text, "isCorrect": o.is_correct} for o in question.options
        ],
        "difficulty": question.difficulty.value if question.difficulty else None,
        "tags": list(question.tags),
        "createdAt": question.created_at,
        "updatedAt": question.updated_at,
    }


def _from_document(doc: dict[str, Any]) -> Question:
    difficulty = doc.get("difficulty")
    return Question(
        id=str(doc["_id"]),
        owner_id=doc["ownerId"],
        type=QuestionType(doc["type"]),
        text=doc["text"],
        options=[
            AnswerOption(id=o["id"], text=o["text"], is_correct=o["isCorrect"])
            for o in doc["options"]
        ],
        difficulty=Difficulty(difficulty) if difficulty else None,
        tags=list(doc.get("tags", [])),
        created_at=doc["createdAt"],
        updated_at=doc["updatedAt"],
    )


class MongoQuestionRepository:
    def __init__(self, collection: Collection) -> None:
        self._col = collection

    def add(self, question: Question) -> Question:
        result = self._col.insert_one(_to_document(question))
        question.id = str(result.inserted_id)
        return question

    def get(self, question_id: str, owner_id: str) -> Question | None:
        oid = _oid(question_id)
        if oid is None:
            return None
        doc = self._col.find_one({"_id": oid, "ownerId": owner_id})
        return _from_document(doc) if doc else None

    def save(self, question: Question) -> None:
        oid = _oid(question.id or "")
        if oid is None:
            return
        self._col.replace_one(
            {"_id": oid, "ownerId": question.owner_id}, _to_document(question)
        )

    def delete(self, question_id: str, owner_id: str) -> bool:
        oid = _oid(question_id)
        if oid is None:
            return False
        result = self._col.delete_one({"_id": oid, "ownerId": owner_id})
        return result.deleted_count == 1

    def list(self, owner_id: str, skip: int, limit: int) -> tuple[list[Question], int]:
        query = {"ownerId": owner_id}
        total = self._col.count_documents(query)
        cursor = self._col.find(query).sort("_id", 1).skip(skip).limit(limit)
        return [_from_document(d) for d in cursor], total