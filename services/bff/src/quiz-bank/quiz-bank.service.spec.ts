import { QuizBankClient } from './quiz-bank.client';
import { QuizBankService } from './quiz-bank.service';

describe('QuizBankService', () => {
  const identity = { userId: 'teacher-1', role: 'TEACHER' };

  const quizBankClient: jest.Mocked<QuizBankClient> = {
    listQuestions: jest.fn(),
    createQuestion: jest.fn(),
    getQuiz: jest.fn(),
    createQuiz: jest.fn(),
  };

  const service = new QuizBankService(quizBankClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists questions through the quiz-bank client', async () => {
    quizBankClient.listQuestions.mockResolvedValue({
      questions: [],
      total: 0,
    });

    await expect(service.listQuestions(identity, 1, 20)).resolves.toEqual({
      questions: [],
      total: 0,
    });

    expect(quizBankClient.listQuestions).toHaveBeenCalledWith(identity, 1, 20);
  });

  it('creates a question through the quiz-bank client', async () => {
    const input = {
      type: 'SINGLE_CHOICE' as const,
      text: '2+2?',
      options: [
        { text: '3', isCorrect: false },
        { text: '4', isCorrect: true },
      ],
      difficulty: 'EASY' as const,
      tags: ['math'],
    };

    quizBankClient.createQuestion.mockResolvedValue({
      id: 'q1',
      ownerId: identity.userId,
      type: 'SINGLE_CHOICE',
      text: '2+2?',
      options: [
        { id: 'o1', text: '3', isCorrect: false },
        { id: 'o2', text: '4', isCorrect: true },
      ],
      difficulty: 'EASY',
      tags: ['math'],
    });

    await expect(service.createQuestion(identity, input)).resolves.toMatchObject({
      id: 'q1',
      text: '2+2?',
    });

    expect(quizBankClient.createQuestion).toHaveBeenCalledWith(identity, input);
  });

  it('gets a quiz through the quiz-bank client', async () => {
    quizBankClient.getQuiz.mockResolvedValue({
      id: 'quiz-1',
      ownerId: identity.userId,
      title: 'Seminar 1',
      questions: [],
      settings: {
        timePerQuestionSeconds: 30,
        speedBonusEnabled: false,
      },
    });

    await expect(service.getQuiz(identity, 'quiz-1')).resolves.toMatchObject({
      id: 'quiz-1',
      title: 'Seminar 1',
    });

    expect(quizBankClient.getQuiz).toHaveBeenCalledWith(identity, 'quiz-1');
  });

  it('creates a quiz through the quiz-bank client', async () => {
    const input = {
      title: 'Seminar 1',
      questionIds: ['q1'],
      settings: {
        timePerQuestionSeconds: 45,
        speedBonusEnabled: true,
      },
    };

    quizBankClient.createQuiz.mockResolvedValue({
      id: 'quiz-1',
      ownerId: identity.userId,
      title: 'Seminar 1',
      questions: [],
      settings: {
        timePerQuestionSeconds: 45,
        speedBonusEnabled: true,
      },
    });

    await expect(service.createQuiz(identity, input)).resolves.toMatchObject({
      id: 'quiz-1',
      title: 'Seminar 1',
    });

    expect(quizBankClient.createQuiz).toHaveBeenCalledWith(identity, input);
  });
});
