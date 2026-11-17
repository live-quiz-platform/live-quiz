# BFF HTTP contract (frontend)

Base URL local: `http://localhost:3001`

Prefix: `/api`

CORS: origin din `CORS_ORIGIN` (default `http://localhost:5173`)

Content-Type pentru request-uri cu body: `application/json`

Auth pe rutele de quiz (temporar pe BFF): pana exista JWT, BFF trimite spre quiz-bank un profesor de dezvoltare (`dev-teacher` / `TEACHER`).

---

## Auth — register

### `POST /api/auth/register`

Creeaza un cont prin BFF → identity (gRPC).

#### Request body

```json
{
  "email": "ana@example.com",
  "password": "password1",
  "displayName": "Ana"
}
```

| Camp | Tip | Reguli |
|------|-----|--------|
| `email` | string | format email valid |
| `password` | string | minim 8 caractere |
| `displayName` | string | minim 1 caracter |

#### Success — `201 Created`

```json
{
  "userId": "756cc775-aaea-42e1-973a-76b6c339591c",
  "email": "ana@example.com",
  "displayName": "Ana"
}
```

#### Errors

| Status | Cand | Exemplu `message` |
|--------|------|-------------------|
| `400` | body invalid (validare BFF) | array cu erori pe campuri |
| `400` | identity respinge inputul | `"email: invalid format"` |
| `409` | email deja folosit | `"email: already exists"` |
| `503` | identity indisponibil | `"identity service unavailable"` |
| `502` | eroare generica identity | `"identity service error"` |

---

## Questions

### `GET /api/questions`

Query optional: `page` (>=1), `pageSize` (1..100).

#### Success — `200 OK`

```json
{
  "questions": [
    {
      "id": "q1",
      "ownerId": "dev-teacher",
      "type": "SINGLE_CHOICE",
      "text": "2+2?",
      "options": [
        { "id": "o1", "text": "3", "isCorrect": false },
        { "id": "o2", "text": "4", "isCorrect": true }
      ],
      "difficulty": "EASY",
      "tags": ["math"]
    }
  ],
  "total": 1
}
```

### `POST /api/questions`

#### Request body

```json
{
  "type": "SINGLE_CHOICE",
  "text": "2+2?",
  "options": [
    { "text": "3", "isCorrect": false },
    { "text": "4", "isCorrect": true }
  ],
  "difficulty": "EASY",
  "tags": ["math"]
}
```

| Camp | Tip | Reguli |
|------|-----|--------|
| `type` | string | `SINGLE_CHOICE` sau `TRUE_FALSE` |
| `text` | string | minim 1 caracter |
| `options` | array | minim 2; fiecare are `text` + `isCorrect` |
| `difficulty` | string | optional: `EASY` / `MEDIUM` / `HARD` |
| `tags` | string[] | optional |

Pentru `TRUE_FALSE`: trimite exact 2 optiuni cu `isCorrect`; textele pot fi goale/placeholder — quiz-bank genereaza „Adevarat” / „Fals”.

#### Success — `201 Created`

Intoarce obiectul `Question` (ca in listare).

#### Errors (questions / quizzes)

| Status | Cand |
|--------|------|
| `400` | validare BFF sau `INVALID_ARGUMENT` din quiz-bank |
| `401` | metadata auth lipsa pe quiz-bank |
| `403` | rol nepermis pe quiz-bank |
| `404` | resursa inexistenta |
| `409` | conflict (ex. intrebare deja in quiz) |
| `412` | preconditie esuata (ex. stergere ultima intrebare) |
| `503` / `502` | quiz-bank indisponibil / eroare generica |

---

## Quizzes

### `GET /api/quizzes/:id`

#### Success — `200 OK`

```json
{
  "id": "quiz-1",
  "ownerId": "dev-teacher",
  "title": "Seminar 1",
  "questions": [
    {
      "position": 1,
      "sourceQuestionId": "q1",
      "type": "SINGLE_CHOICE",
      "text": "2+2?",
      "options": [
        { "id": "o1", "text": "3", "isCorrect": false },
        { "id": "o2", "text": "4", "isCorrect": true }
      ],
      "difficulty": "EASY",
      "tags": ["math"]
    }
  ],
  "settings": {
    "timePerQuestionSeconds": 45,
    "speedBonusEnabled": true
  }
}
```

### `POST /api/quizzes`

#### Request body

```json
{
  "title": "Seminar 1",
  "questionIds": ["q1", "q2"],
  "settings": {
    "timePerQuestionSeconds": 45,
    "speedBonusEnabled": true
  }
}
```

| Camp | Tip | Reguli |
|------|-----|--------|
| `title` | string | minim 1 caracter |
| `questionIds` | string[] | minim 1 id |
| `settings.timePerQuestionSeconds` | number | optional, 5..300 |
| `settings.speedBonusEnabled` | boolean | optional |

#### Success — `201 Created`

Intoarce obiectul `Quiz` (cu snapshot-urile intrebarilor).

---

## Inca neimplementate (501)

- `POST /api/auth/login`
- `GET /api/me`

---

## Exemple curl

```bash
# register
curl -s -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"password1","displayName":"Ana"}'

# create question
curl -s -X POST http://localhost:3001/api/questions \
  -H 'Content-Type: application/json' \
  -d '{"type":"SINGLE_CHOICE","text":"2+2?","options":[{"text":"3","isCorrect":false},{"text":"4","isCorrect":true}],"difficulty":"EASY","tags":["math"]}'

# list questions
curl -s 'http://localhost:3001/api/questions?page=1&pageSize=20'

# create quiz
curl -s -X POST http://localhost:3001/api/quizzes \
  -H 'Content-Type: application/json' \
  -d '{"title":"Seminar 1","questionIds":["REPLACE_WITH_QUESTION_ID"],"settings":{"timePerQuestionSeconds":45,"speedBonusEnabled":true}}'

# get quiz
curl -s http://localhost:3001/api/quizzes/REPLACE_WITH_QUIZ_ID
```
