# BFF HTTP contract (frontend)

Base URL local: `http://localhost:3001`

Prefix: `/api`

CORS: origin din `CORS_ORIGIN` (default `http://localhost:5173`)

Content-Type pentru request-uri cu body: `application/json`

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
| `400` | body invalid (validare BFF) | array cu erori pe campuri (`email must be an email`, ...) |
| `400` | identity respinge inputul | `"email: invalid format"` / `"password: must contain at least 8 characters"` / `"display_name: is required"` |
| `409` | email deja folosit | `"email: already exists"` |
| `503` | identity indisponibil | `"identity service unavailable"` |
| `502` | eroare generica identity | `"identity service error"` |

Nota: la `400` din ValidationPipe, `message` poate fi un **array** de string-uri. La erorile mapate din gRPC, `message` e de obicei un **string**.

---

## Inca neimplementate (501)

Nu le folosi inca in FE:

- `POST /api/auth/login`
- `GET /api/me`
- `GET|POST /api/questions`
- `GET|POST /api/quizzes`

---

## Exemplu curl

```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"password1","displayName":"Ana"}'
```
