export type QuestionType = 'SINGLE_CHOICE' | 'TRUE_FALSE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type CallerIdentity = {
  userId: string;
  role: string;
};

export type AnswerOption = {
  id?: string;
  text: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  ownerId: string;
  type: QuestionType;
  text: string;
  options: AnswerOption[];
  difficulty?: Difficulty;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateQuestionInput = {
  type: QuestionType;
  text: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  difficulty?: Difficulty;
  tags?: string[];
};

export type QuizSettings = {
  timePerQuestionSeconds: number;
  speedBonusEnabled: boolean;
};

export type QuizQuestion = {
  position: number;
  sourceQuestionId: string;
  type: QuestionType;
  text: string;
  options: AnswerOption[];
  difficulty?: Difficulty;
  tags: string[];
};

export type Quiz = {
  id: string;
  ownerId: string;
  title: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateQuizInput = {
  title: string;
  questionIds: string[];
  settings?: Partial<QuizSettings>;
};

export type QuestionList = {
  questions: Question[];
  total: number;
};

export const QUIZ_BANK_CLIENT = Symbol('QUIZ_BANK_CLIENT');

export interface QuizBankClient {
  listQuestions(
    identity: CallerIdentity,
    page?: number,
    pageSize?: number,
  ): Promise<QuestionList>;

  createQuestion(
    identity: CallerIdentity,
    input: CreateQuestionInput,
  ): Promise<Question>;

  getQuiz(identity: CallerIdentity, quizId: string): Promise<Quiz>;

  createQuiz(identity: CallerIdentity, input: CreateQuizInput): Promise<Quiz>;
}
