# Survey Builder

A small survey app I built using React, TypeScript, Express, and MongoDB. An author can create surveys, add questions, publish them, collect responses, and view the results. Respondents can fill out published surveys using a separate link.

**Live app:** https://survey-project-ten.vercel.app (author)
respondent url: https://survey-project-ten.vercel.app/respond/<survey-id>

**Live API:** https://survey-project-7ej2.onrender.com

### Trying the live app

1. Open the live app using the link above.
2. Create a survey, add questions, and publish it.
3. To open a survey as a respondent, copy the survey ID from the editor URL and use the format below.

   `https://survey-project-ten.vercel.app/respond/<survey-id>`

   Replace `<survey-id>` with the actual ID of a published survey.

**Example survey IDs to try:**

- Survey ID: f8815f32-565a-49a7-9e5d-09ab1066bab3
  
  Respondent URL: https://survey-project-ten.vercel.app/respond/f8815f32-565a-49a7-9e5d-09ab1066bab3

- Survey ID: 1ca0e36c-de5a-43dc-aec4-b48f8cabce2d
  
  Respondent URL: https://survey-project-ten.vercel.app/respond/1ca0e36c-de5a-43dc-aec4-b48f8cabce2d

The API uses a free hosting plan and may take up to a minute to respond after being idle. If the app cannot load surveys initially, wait a little and refresh.

## What it does

The author creates a draft survey with a title and description. Each survey can have up to five questions: short text, long text, single choice, multiple choice, or a rating from 1 to 5. Questions can be marked as required, reordered, or duplicated.

The author can preview a survey before publishing it and delete drafts that are no longer needed. Once published, the questions cannot be changed. When a survey is closed, it no longer accepts new responses, but existing responses and results remain available.

The dashboard displays surveys ten at a time and can filter them by status. The results page shows the total number of responses, option counts, average ratings, charts, and text answers. Individual responses are also displayed with pagination.

## Tech stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Express, TypeScript, Node.js
- **Database:** MongoDB and Mongoose
- **Testing:** Vitest
- **Deployment:** Vercel, Render, MongoDB Atlas

## Running it locally

### Requirements

Install Node.js (LTS) and Docker Desktop. Make sure Docker Desktop is running.

### 1. Set up environment files

There are two `.env.example` files: one in the main folder and one in the `backend` folder. Copy each to `.env` in the same folder.

**Main folder `.env`:**

```env
MONGO_USER=your-user
MONGO_PASSWORD=your-password
```

**Backend `.env`:**

```env
PORT=4000
MONGO_URL=mongodb://your-user:your-password@localhost:27017/survey?authSource=admin
```

Replace the example username and password with the same credentials in both files. These are for your local MongoDB database. Do not commit real `.env` files to GitHub.

The frontend uses `http://localhost:4000` by default. If needed, create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:4000
```

### 2. Start the database

From the main project folder:

```bash
docker compose up -d
```

Check that it is running:

```bash
docker compose ps
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
```

The API should be available at `http://localhost:4000`.

### 4. Start the frontend

Open another terminal from the main project folder:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 5. Add demo data

From the backend folder:

```bash
npm run seed
```

This adds 31 fictional surveys, including surveys with responses for testing pagination.

To clear the database, run `npm run reset` from the backend folder. The seed command also clears existing data before adding the demo data again.

## Tests

From the backend folder:

```bash
npx tsc --noEmit
npx vitest run
```

To build the frontend:

```bash
cd frontend
npm run build
```

## Project structure

- `backend/src/api` — API routes
- `backend/src/domain` — survey rules and tests
- `backend/src/infrastructure` — database connection and data operations
- `frontend/src/pages` — frontend pages
- `docs` — API documentation, architecture notes, and acceptance checklist

## Deployment

The frontend is hosted on Vercel, the API on Render, and the database on MongoDB Atlas. The frontend uses `VITE_API_URL`, while the backend uses `MONGO_URL` and `FRONTEND_URL`.

The live database contains fictional demo data created using the seed script.

## Limitations

- There is no login, so the author pages are not protected.
- Published survey questions cannot be edited.
- The editor does not provide a helper-text input, although the API and forms support helper text.
- MongoDB Atlas allows connections from any IP address because the free host's address changes. Database access still requires credentials.
- The free API host sleeps when idle, so the first request can be slow.

## Documentation

- [API documentation](docs/api.md)
- [Architecture](docs/architecture.md)
- [Acceptance checklist](docs/acceptance.md)
