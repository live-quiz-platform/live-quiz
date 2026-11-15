# quiz-bank

Microserviciu gRPC pentru banca de întrebări și quiz-urile unui profesor. Expune doar gRPC (port 50052), fără HTTP/REST, iar datele sunt în MongoDB. Conține două module separate (`questions` și `quizzes`) în același proces, care pot fi despărțite ulterior fără să se schimbe contractele.

## Structură

- `src/quiz_bank/questions/`, `src/quiz_bank/quizzes/`: module cu straturile `domain`, `application`, `infrastructure`, `grpc`.
- `src/quiz_bank/shared/`: erori, autorizare, traducerea erorilor în coduri gRPC.
- `src/quiz_bank/composition.py`: singurul loc unde se leagă cele două module.
- Contracte: `proto/question_bank/v1/question_bank.proto` și `proto/quiz/v1/quiz.proto`.

## Pornire locală (Windows, PowerShell)

Din rădăcina repo-ului:

```powershell
docker compose up -d mongodb
cd services\quiz-bank
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cd ..\..
$env:PYTHON = "python"
& "C:\Program Files\Git\bin\bash.exe" scripts/gen_proto.sh
cd services\quiz-bank
python -m quiz_bank.main
```

Variabile de mediu: `GRPC_PORT` (implicit 50052), `MONGO_URI` (implicit local, cu `authSource=admin`).

În Docker: `docker compose up -d --build quiz-bank` (din rădăcină).

## Generare stub-uri

Stub-urile se generează în `src/quiz_bank/generated/` (nu se versionează):

```powershell
$env:PYTHON = "python"
& "C:\Program Files\Git\bin\bash.exe" scripts/gen_proto.sh
```

Pe Linux/macOS: `bash scripts/gen_proto.sh`. Lint contracte: `cd proto; buf lint`.

## Teste

Din `services/quiz-bank`, cu venv activ:

```powershell
ruff check .
pytest tests/unit -q
pytest tests/integration -q    # cere Docker pornit (MongoDB prin testcontainers)
pytest -q --cov
coverage report --include='*/domain/*' --fail-under=70
```

## Autorizare

Metadata gRPC obligatorie: `x-user-id` și `x-user-role: TEACHER`. Lipsa lor dă `UNAUTHENTICATED`, alt rol dă `PERMISSION_DENIED`. Health check-ul (`grpc.health.v1`) nu cere metadata.

## Exemple grpcurl

Serverul nu are reflection, de aceea se folosește `-import-path proto -proto ...`. Rulează din rădăcina repo-ului. Înlocuiește `<ID>` cu id-urile reale din răspunsuri.

Prefix comun folosit mai jos pentru întrebări:

```powershell
$Q = @("-plaintext","-import-path","proto","-proto","question_bank/v1/question_bank.proto","-H","x-user-id: u1","-H","x-user-role: TEACHER")
$Z = @("-plaintext","-import-path","proto","-proto","quiz/v1/quiz.proto","-H","x-user-id: u1","-H","x-user-role: TEACHER")
```

### Întrebări

```powershell
# CreateQuestion
'{"type":"QUESTION_TYPE_SINGLE_CHOICE","text":"2+2?","options":[{"text":"3"},{"text":"4","is_correct":true}],"difficulty":"DIFFICULTY_EASY","tags":["mate"]}' | grpcurl @Q -d '@' localhost:50052 question_bank.v1.QuestionService/CreateQuestion

# CreateQuestion adevarat/fals (textele se genereaza)
'{"type":"QUESTION_TYPE_TRUE_FALSE","text":"Cerul e albastru","options":[{"is_correct":true},{}]}' | grpcurl @Q -d '@' localhost:50052 question_bank.v1.QuestionService/CreateQuestion

# GetQuestion
'{"id":"<ID>"}' | grpcurl @Q -d '@' localhost:50052 question_bank.v1.QuestionService/GetQuestion

# ListQuestions
'{"page":1,"page_size":20}' | grpcurl @Q -d '@' localhost:50052 question_bank.v1.QuestionService/ListQuestions

# UpdateQuestion (inlocuieste tot continutul editabil)
'{"id":"<ID>","type":"QUESTION_TYPE_SINGLE_CHOICE","text":"3+3?","options":[{"text":"5"},{"text":"6","is_correct":true}]}' | grpcurl @Q -d '@' localhost:50052 question_bank.v1.QuestionService/UpdateQuestion

# DeleteQuestion
'{"id":"<ID>"}' | grpcurl @Q -d '@' localhost:50052 question_bank.v1.QuestionService/DeleteQuestion
```

### Quiz-uri

```powershell
# CreateQuiz (setarile sunt optionale)
'{"title":"Seminar 1","question_ids":["<Q1>","<Q2>"],"settings":{"time_per_question_seconds":45,"speed_bonus_enabled":true}}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/CreateQuiz

# GetQuiz
'{"id":"<ID>"}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/GetQuiz

# ListQuizzes
'{"page":1,"page_size":20}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/ListQuizzes

# UpdateQuizTitle
'{"id":"<ID>","title":"Titlu nou"}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/UpdateQuizTitle

# AddQuestionToQuiz
'{"quiz_id":"<ID>","question_id":"<Q3>"}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/AddQuestionToQuiz

# RemoveQuestionFromQuiz
'{"quiz_id":"<ID>","question_id":"<Q3>"}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/RemoveQuestionFromQuiz

# ReorderQuizQuestions (lista completa, in noua ordine)
'{"quiz_id":"<ID>","question_ids":["<Q2>","<Q1>"]}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/ReorderQuizQuestions

# UpdateQuizSettings
'{"quiz_id":"<ID>","settings":{"time_per_question_seconds":60,"speed_bonus_enabled":false}}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/UpdateQuizSettings

# DeleteQuiz
'{"id":"<ID>"}' | grpcurl @Z -d '@' localhost:50052 quiz.v1.QuizService/DeleteQuiz
```

Pe bash, aceleași apeluri merg cu `echo '<json>' | grpcurl -plaintext -import-path proto -proto ... -H "x-user-id: u1" -H "x-user-role: TEACHER" -d @ localhost:50052 <serviciu>/<metoda>`.

## Maparea erorilor

| Situație | Cod gRPC |
| --- | --- |
| Validare (toate erorile, câte una pe linie, `câmp: motiv`) | `INVALID_ARGUMENT` |
| Resursă inexistentă, a altui profesor sau id invalid | `NOT_FOUND` |
| Întrebare duplicată în quiz (și la `CreateQuiz`) | `ALREADY_EXISTS` |
| Ștergerea ultimei întrebări dintr-un quiz | `FAILED_PRECONDITION` |
| Listă de reordonare care nu e permutare | `INVALID_ARGUMENT` |

## Decizii

- Repo-ul câștigă în fața promptului: serviciul `bff` nu există în `compose.yaml`, deci nu a fost adăugat.
- `config.py`: `MONGO_URI` are valoare implicită doar pentru dezvoltare locală; în Docker vine din `compose.yaml`.
- Fișiere suplimentare față de structura inițială: `infrastructure/__init__.py`, `infrastructure/mongo.py`, `shared/grpc_errors.py`, `scripts/check_health.py`, `tests/integration/conftest.py`.
- `grpcurl` se folosește cu `-import-path proto -proto ...`, fiindcă serverul nu activează reflection.
- Mesajele de validare au forma `câmp: motiv`, sunt returnate toate odată, fără diacritice.
- `TRUE_FALSE`: clientul trimite 2 variante cu `is_correct` (textul e ignorat); serverul generează „Adevarat" / „Fals", în ordinea în care au fost trimise flagurile.
- Variantele duplicate se detectează după text, ignorând majusculele și spațiile (inclusiv cele interioare multiple).
- Id-urile variantelor sunt UUID hex generate de server; id-urile expuse prin gRPC sunt string-uri (ObjectId în Mongo).
- Paginare: `page` < 1 devine 1; `page_size` <= 0 devine 20; peste 100 devine 100.
- Resursa altui profesor și un id invalid dau `NOT_FOUND`.
- Quiz-ul păstrează un snapshot `frozen` al întrebării; modificarea sau ștergerea ei din bancă nu îl afectează.
- Pozițiile sunt continue de la 1 și se renumerotează după ștergere și reordonare.
- Titlu gol și quiz fără întrebări sunt `INVALID_ARGUMENT`, raportate împreună.
- `CreateQuiz` cu întrebare inexistentă sau a altui profesor dă `NOT_FOUND`.
- Conversia `Question` → `QuestionSnapshot` este în `composition.py`, ca `quizzes` să nu importe din `questions`.
- `timePerQuestionSeconds` valid între 5 și 300 inclusiv (implicit 30); `speedBonusEnabled` implicit `false`.
- `UpdateQuizSettings` cere `settings` (altfel `INVALID_ARGUMENT`) și înlocuiește ambele valori; 0 nu înseamnă „implicit".
- `CreateQuiz` fără `settings` folosește valorile implicite; dacă sunt prezente, se validează.
- În clasele cu metodă `list`, aceasta se definește ultima, ca să nu strice adnotările `list[...]`.
- Sufixul `?authSource=admin` e necesar, fiindcă utilizatorul root există în baza `admin`.