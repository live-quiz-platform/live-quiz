# live-quiz

Live quiz platform for seminars, microservices architecture.

## BFF

```bash
cd services/bff
cp .env.example .env
npm install
npm run start:dev
```

- `GET /api/health` works
- users / quiz-bank routes return 501 until gRPC clients are wired
- tests: `npm test`
