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
- `POST /api/auth/register` → identity gRPC `Register` (needs identity + TLS CA)
- login / me / quiz-bank routes return 501 until wired
- tests: `npm test`

### Local register smoke (identity in Docker)

```bash
# from repo root
docker compose up -d postgres identity-tls-init identity-migrate identity
docker compose cp identity:/run/identity-tls/ca.crt .local/identity-tls/ca.crt

cd services/bff
npm run start:dev

curl -s -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","password":"password1","displayName":"Student"}'
```
