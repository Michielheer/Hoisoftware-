# Hoi Software

Een takenbeheer-webapplicatie met een React + TypeScript frontend en een Node.js/Express backend.

## Functionaliteit

- Taken toevoegen met een titel en optionele notitie
- Taken afvinken, filteren (alle / open / klaar) en verwijderen
- Taken worden op de server bewaard in `server/data/tasks.json`
- Nederlandstalige interface met licht/donker thema (volgt je systeeminstelling)

## Structuur

```
client/   React + TypeScript frontend (Vite)
server/   Express REST API + JSON-opslag
```

## Aan de slag

Vereist Node.js 20 of nieuwer.

```bash
npm install

# Ontwikkelmodus: server (poort 3001) + frontend (poort 5173) tegelijk
npm run dev
```

Open daarna http://localhost:5173.

## Productie

```bash
npm run build   # bouwt de frontend naar client/dist
npm start       # Express serveert de API én de gebouwde frontend op poort 3001
```

## API

| Methode | Pad              | Omschrijving                     |
| ------- | ---------------- | -------------------------------- |
| GET     | `/api/health`    | Statuscheck                      |
| GET     | `/api/tasks`     | Alle taken ophalen               |
| POST    | `/api/tasks`     | Taak aanmaken (`title`, `notes`) |
| PATCH   | `/api/tasks/:id` | Taak bijwerken                   |
| DELETE  | `/api/tasks/:id` | Taak verwijderen                 |

## Tests

```bash
npm test
```

Draait de API-tests van de server (Node's ingebouwde testrunner).
