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