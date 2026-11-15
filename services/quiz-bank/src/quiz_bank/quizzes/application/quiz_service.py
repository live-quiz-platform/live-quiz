from quiz_bank.quizzes.application.ports import QuestionReader, QuizRepository
from quiz_bank.quizzes.domain.quiz import QuestionSnapshot, Quiz, QuizSettings
from quiz_bank.shared.errors import not_found

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class QuizService:
    def __init__(self, repository: QuizRepository, questions: QuestionReader) -> None:
        self._repo = repository
        self._questions = questions

    def _snapshot(self, owner_id: str, question_id: str) -> QuestionSnapshot:
        snapshot = self._questions.read(question_id, owner_id)
        if snapshot is None:
            raise not_found("intrebarea nu exista")
        return snapshot

    def create(
        self,
        owner_id: str,
        title: str,
        question_ids: list[str],
        settings: QuizSettings | None = None,
    ) -> Quiz:
        snapshots = [self._snapshot(owner_id, qid) for qid in question_ids]
        quiz = Quiz.create(owner_id, title, snapshots, settings)
        return self._repo.add(quiz)

    def get(self, owner_id: str, quiz_id: str) -> Quiz:
        quiz = self._repo.get(quiz_id, owner_id)
        if quiz is None:
            raise not_found("quiz-ul nu exista")
        return quiz

    def update_title(self, owner_id: str, quiz_id: str, title: str) -> Quiz:
        quiz = self.get(owner_id, quiz_id)
        quiz.rename(title)
        self._repo.save(quiz)
        return quiz

    def add_question(self, owner_id: str, quiz_id: str, question_id: str) -> Quiz:
        quiz = self.get(owner_id, quiz_id)
        quiz.add_question(self._snapshot(owner_id, question_id))
        self._repo.save(quiz)
        return quiz

    def remove_question(self, owner_id: str, quiz_id: str, question_id: str) -> Quiz:
        quiz = self.get(owner_id, quiz_id)
        quiz.remove_question(question_id)
        self._repo.save(quiz)
        return quiz

    def reorder(self, owner_id: str, quiz_id: str, question_ids: list[str]) -> Quiz:
        quiz = self.get(owner_id, quiz_id)
        quiz.reorder(question_ids)
        self._repo.save(quiz)
        return quiz

    def delete(self, owner_id: str, quiz_id: str) -> None:
        if not self._repo.delete(quiz_id, owner_id):
            raise not_found("quiz-ul nu exista")

    def list(self, owner_id: str, page: int, page_size: int) -> tuple[list[Quiz], int]:
        page = max(page, 1)
        if page_size <= 0:
            page_size = DEFAULT_PAGE_SIZE
        page_size = min(page_size, MAX_PAGE_SIZE)
        return self._repo.list(owner_id, (page - 1) * page_size, page_size)