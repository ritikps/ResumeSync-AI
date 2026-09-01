# ResumeSync AI

ResumeSync AI is a full-stack AI-powered resume analysis platform that compares a candidate's resume with a job description and generates a match score, skill gaps, and actionable recommendations.

## Features

* Upload resume as a PDF
* Extract resume text automatically
* Compare resume against a job description
* AI-generated resume match score from 0–100
* Identify missing skills and keywords
* Generate personalized improvement recommendations
* Store analysis history in PostgreSQL
* REST API built with Node.js and Express
* PostgreSQL JSONB storage for AI-generated data
* API health-check endpoint
* PDF file validation and 5MB upload limit
* CORS configuration for frontend and backend
* Environment-based configuration

## Tech Stack

### Frontend

* React
* JavaScript
* Tailwind CSS

### Backend

* Node.js
* Express.js
* Multer
* PDF Parser

### Database

* PostgreSQL
* JSONB

### AI

* Google Gemini API

## Architecture

```text
                    ┌─────────────────────┐
                    │      React UI       │
                    └──────────┬──────────┘
                               │
                               │ HTTP
                               ▼
                    ┌─────────────────────┐
                    │   Express.js API    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │ PDF Parser  │       │ Gemini API  │
             └─────────────┘       └──────┬──────┘
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │ AI Analysis   │
                                  └───────┬───────┘
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │  PostgreSQL   │
                                  └───────────────┘
```

## How It Works

1. User uploads a resume PDF.
2. User enters a job description.
3. The backend extracts text from the PDF.
4. Resume text and job description are sent to Gemini.
5. Gemini generates:

   * Match score
   * Candidate-fit summary
   * Missing skills and keywords
   * Improvement recommendations
6. The backend validates the AI response.
7. The analysis is stored in PostgreSQL.
8. The result is returned to the frontend.
9. Previous analyses can be retrieved through the history API.

## Project Structure

```text
ResumeSync-AI/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── ...
│
├── .gitignore
└── README.md
```

## Database Setup

Create the PostgreSQL database:

```sql
CREATE DATABASE resume_matcher;
```

Connect to the database:

```bash
psql -U postgres -d resume_matcher
```

Create the tables:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    job_title VARCHAR(255),
    match_score INT,
    summary TEXT,
    gaps JSONB,
    recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

Create `server/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/resume_matcher
```

Never commit `.env` or API keys to GitHub.

Create `server/.env.example` instead:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/resume_matcher
```

## Installation

Clone the repository:

```bash
git clone https://github.com/ritikcodes405/ResumeSync-AI.git
cd ResumeSync-AI
```

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../client
npm install
```

## Run the Backend

From the `server` directory:

```bash
node server.js
```

The backend runs on:

```text
http://localhost:5000
```

## Run the Frontend

From the `client` directory:

```bash
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## API Endpoints

### Analyze Resume

```http
POST /api/analyze
```

Form data:

```text
resume          PDF file
jobDescription  Job description text
```

Example response:

```json
{
  "id": 1,
  "matchScore": 82,
  "summary": "Strong match for the role with relevant full-stack experience.",
  "gaps": [
    "Docker",
    "AWS"
  ],
  "recommendations": [
    "Add Docker-based deployment experience.",
    "Highlight cloud deployment projects."
  ],
  "created_at": "2026-09-02T00:00:00.000Z"
}
```

### Analysis History

```http
GET /api/history
```

Returns the latest 15 resume analyses.

### Health Check

```http
GET /api/health
```

Example:

```json
{
  "status": "ok",
  "database": "connected",
  "databaseName": "resume_matcher",
  "user": "postgres"
}
```

## Security

* API keys are stored using environment variables.
* `.env` files are excluded from Git.
* Resume uploads are restricted to PDF files.
* File uploads are limited to 5MB.
* CORS is configured for allowed frontend origins.
* AI responses are validated before database insertion.
* PostgreSQL queries use parameterized values.

## Future Improvements

* User authentication and authorization
* Resume and job-description persistence
* Redis caching
* API rate limiting
* Background job processing
* Resume skill extraction
* Job recommendation system
* Resume improvement suggestions
* Automated testing
* Docker support
* CI/CD pipeline
* Monitoring and analytics
* Production cloud deployment

## Author

**Ritik**

GitHub: https://github.com/ritikcodes405

## License

This project is intended for educational and portfolio purposes.

```

One important thing: because your repository previously contained an API key, **make sure `.env` is excluded before committing this README**. Also don't put your actual Gemini key anywhere in the README.
```
