# CRM Server

Node + TypeScript API (Express + SQLite via better-sqlite3) with JWT auth and
Excel export.

## Setup

```bash
cp .env.example .env     # then edit JWT_SECRET
npm install
npm run dev              # starts on http://localhost:4000 (tsx watch)
```

Optionally seed demo data (creates an account + sample Singapore customers):

```bash
npm run seed
# Login: [email protected] / demo1234
```

## Production

```bash
npm run build
npm start
```

## Data

- SQLite database is stored at `server/data/crm.sqlite` by default.
- Override the location with the `CRM_DATA_DIR` environment variable.
- This file is git-ignored.

## API overview

| Method | Path                               | Description                         |
| ------ | ---------------------------------- | ----------------------------------- |
| POST   | `/api/auth/register`               | Create account, returns JWT         |
| POST   | `/api/auth/login`                  | Login, returns JWT                  |
| GET    | `/api/customers`                   | Search / list (query params below)  |
| POST   | `/api/customers`                   | Create customer                     |
| GET    | `/api/customers/:id`               | Get one                             |
| PUT    | `/api/customers/:id`               | Update                              |
| PATCH  | `/api/customers/:id/status`        | Change status / archive / restore   |
| POST   | `/api/customers/:id/activities`    | Add an activity-log note            |
| DELETE | `/api/customers/:id`               | Hard delete                         |
| GET    | `/api/alerts`                      | Upcoming birthdays + follow-ups     |
| GET    | `/api/export`                      | Download search results as `.xlsx`  |

### Search query params

`q` (keyword), `status`, `transactionType`, `propertyType`, `districtCode`,
`location`, `budgetMin`, `budgetMax`, `includeArchived`.

All customer routes require `Authorization: Bearer <token>`.
