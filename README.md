# Affiliate Lead Dashboard

React + Vite dashboard for affiliate lead submission, Airtable-synced status tracking, and partner-team messaging.

## 1. Setup

Install dependencies:

```bash
npm install
```

Create your env file:

```bash
cp .env.example .env
```

Fill `.env` with your Airtable credentials:

- `VITE_AIRTABLE_TOKEN`
- `VITE_AIRTABLE_BASE_ID`
- `VITE_AIRTABLE_TABLE_ID`
- `VITE_AIRTABLE_AFFILIATE_COMMENTS_TABLE_ID` (defaults to `tblrMlNIChN4hKVkM`)

Optional field-name variables are documented in `.env.example` if your Airtable column names differ.

## 2. Run

```bash
npm run dev
```

## 3. Airtable Integration

- Form submissions create new records via `POST /v0/{baseId}/{tableId}`.
- The leads table is loaded via `GET /v0/{baseId}/{tableId}`.
- Lead detail chat loads linked comment records from the Affiliate Comments table using a filtered `GET`.
- Chat messages create new records in the Affiliate Comments table linked to the selected lead.
