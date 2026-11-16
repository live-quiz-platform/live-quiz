from pymongo import ASCENDING, MongoClient

QUESTION_BANK_DB = "question_bank"
QUIZ_DB = "quiz"


def create_client(uri: str) -> MongoClient:
    return MongoClient(uri, serverSelectionTimeoutMS=5000, tz_aware=True)


def ensure_indexes(client: MongoClient) -> None:
    client[QUESTION_BANK_DB]["questions"].create_index([("ownerId", ASCENDING)], name="ownerId_1")
    client[QUIZ_DB]["quizzes"].create_index([("ownerId", ASCENDING)], name="ownerId_1")