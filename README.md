# live-quiz

Live quiz platform for seminars, microservices architecture.

## BFF

```bash
cd services/bff
cp .env.example .env
npm install
npm run start:dev
```

- `GET /api/health`
- `POST /api/auth/register` → identity gRPC
- `GET|POST /api/questions`, `GET|POST /api/quizzes` → quiz-bank gRPC
- login / me still 501
- FE contract: [`services/bff/CONTRACT.md`](services/bff/CONTRACT.md)
- tests: `npm test`

### Local smoke (identity + quiz-bank)

```bash
# from repo root
cp .env.example .env
docker compose up -d postgres mongodb identity-tls-init identity-migrate identity quiz-bank
mkdir -p .local/identity-tls
docker compose cp identity:/run/identity-tls/ca.crt .local/identity-tls/ca.crt

cd services/bff
cp .env.example .env
npm install
npm run start:dev
```

Examples: see [`services/bff/CONTRACT.md`](services/bff/CONTRACT.md).
