# BFF (Backend for Frontend)

Serviciu NestJS / TypeScript. Singurul entrypoint HTTP pentru frontend.

- REST/JSON pe port `3001`
- gRPC către `identity` (TLS) și `quiz-bank` (plaintext)
- Fără bază de date proprie
- Login / refresh / logout via identity; `/me` validează JWT local

Contract detaliat pentru FE: [`CONTRACT.md`](./CONTRACT.md)

---

## Pornire locala

Din acest folder:

```bash
cp .env.example .env
npm install
npm run start:dev
```

Health:

```bash
curl http://localhost:3001/api/health
```

### Dependente (Docker, din radacina repo-ului)

```bash
cd ../..
docker compose up -d postgres mongodb identity-tls-init identity-migrate identity quiz-bank
mkdir -p .local/identity-tls
docker compose cp identity:/run/identity-tls/ca.crt .local/identity-tls/ca.crt
```

`.env` local trebuie sa pointeze la:

- `IDENTITY_GRPC_URL=localhost:50051`
- `IDENTITY_TLS_CA_FILE=../../.local/identity-tls/ca.crt`
- `IDENTITY_JWT_SECRET` — **același** secret ca identity (din root `.env` / compose), minim 32 caractere
- `QUIZ_BANK_GRPC_URL=localhost:50052`
- `QUIZ_BANK_PROTO_ROOT=../../proto`

---

## Scripturi

| Comanda | Ce face |
|---------|---------|
| `npm run start:dev` | server cu watch |
| `npm run build` | compileaza in `dist/` |
| `npm run start:prod` | ruleaza build-ul |
| `npm test` | unit + e2e |
| `npm run lint` | `tsc --noEmit` |

---

## Rute HTTP

Prefix global: `/api`

| Method | Path | Status | Descriere |
|--------|------|--------|-----------|
| `GET` | `/api/health` | 200 | health check |
| `POST` | `/api/auth/register` | 201 | register via identity |
| `POST` | `/api/auth/login` | 200 | login → access + refresh tokens |
| `POST` | `/api/auth/refresh` | 200 | rotește refresh token |
| `POST` | `/api/auth/logout` | 200 | revocă refresh family |
| `GET` | `/api/me` | 200 | userId + role din JWT (`Authorization: Bearer`) |
| `GET` | `/api/questions` | 200 | lista intrebari (`?page=&pageSize=`) |
| `POST` | `/api/questions` | 201 | creeaza intrebare |
| `GET` | `/api/quizzes/:id` | 200 | detalii quiz |
| `POST` | `/api/quizzes` | 201 | creeaza quiz |

Body-uri, erori (400/401/403/404/409/…) si exemple: vezi [`CONTRACT.md`](./CONTRACT.md).

### Auth pe quiz-bank (temporar)

Rutele de questions/quizzes trimit încă metadata gRPC de dezvoltare:

- `x-user-id: dev-teacher`
- `x-user-role: TEACHER`

(`professor` din identity se mapeaza la `TEACHER` in clientul gRPC.) Următorul pas: folosi JWT-ul de pe login în loc de `DEV_TEACHER`.

---

## Structura

```
src/
  health/          # GET /health
  users/           # register, login, refresh, logout, me
  identity/        # client gRPC identity + mapare erori
  quiz-bank/       # questions/quizzes HTTP + client gRPC quiz-bank
test/              # e2e
```

---

## Exemple rapide

```bash
# register
curl -s -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"password1","displayName":"Ana"}'

# login
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@example.com","password":"password1"}'

# me
curl -s http://localhost:3001/api/me \
  -H 'Authorization: Bearer ACCESS_TOKEN'

# create question
curl -s -X POST http://localhost:3001/api/questions \
  -H 'Content-Type: application/json' \
  -d '{"type":"SINGLE_CHOICE","text":"2+2?","options":[{"text":"3","isCorrect":false},{"text":"4","isCorrect":true}],"difficulty":"EASY","tags":["math"]}'

# list questions
curl -s 'http://localhost:3001/api/questions?page=1&pageSize=20'

# create quiz (inlocuieste QUESTION_ID)
curl -s -X POST http://localhost:3001/api/quizzes \
  -H 'Content-Type: application/json' \
  -d '{"title":"Seminar 1","questionIds":["QUESTION_ID"],"settings":{"timePerQuestionSeconds":45,"speedBonusEnabled":true}}'
```
