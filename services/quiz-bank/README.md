# quiz-bank

Serviciul gestioneaza banca de intrebari si quiz-urile pentru platforma live.

## Decizii

- `config.py` are `MONGO_URI` implicit doar pentru dezvoltare locală; în Docker vine din `compose.yaml`.
- `infrastructure/mongo.py` este un fișier suplimentar față de structura inițială.
- `grpcurl` se folosește cu `-import-path proto -proto ...`, fiindcă serverul nu activează reflection.
- Mesajele de validare au forma `câmp: motiv`, iar `ValidationError` le poartă pe toate.
- `TRUE_FALSE`: clientul trimite 2 variante cu `is_correct` setat (textul e ignorat); serverul generează „Adevarat" / „Fals", în această ordine.
- Duplicatele de variante se detectează după text, ignorând majusculele și spațiile.
page < 1 devine 1; page_size <= 0 devine 20, iar peste 100 devine 100.
Resursa altui profesor => NOT_FOUND, la fel ca resursa inexistentă.

page < 1 devine 1; page_size <= 0 devine 20, iar peste 100 devine 100.
Resursa altui profesor și un id invalid dau NOT_FOUND.
Fișiere suplimentare față de structura inițială: shared/grpc_errors.py, infrastructure/mongo.py.

Quiz-ul copiază întrebarea (snapshot frozen, cu variantele ca tupluri imutabile) la momentul adăugării.
Poziția e continuă, de la 1; după ștergere sau reordonare se renumerotează.
settings are valorile implicite 30 s / false; validarea setărilor (US-08b) o adaug în Etapa 5, dar o prevăd deja în structura QuizSettings.
Titlul gol (sau doar spații) e invalid; un quiz are cel puțin o întrebare, deci Quiz.create cu listă goală e INVALID_ARGUMENT.