const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://resume-matcher.vercel.app'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json());

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  console.error('DATABASE_URL is missing from .env');
  process.exit(1);
}

const databaseUrl = rawDatabaseUrl
  .replace(/^DATABASE_URL=/, '')
  .trim();

let parsedDatabaseUrl;

try {
  parsedDatabaseUrl = new URL(databaseUrl);
} catch (error) {
  console.error('Invalid DATABASE_URL in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: parsedDatabaseUrl.toString(),
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
});

pool
  .connect()
  .then((client) => {
    console.log('PostgreSQL connected successfully');
    client.release();
  })
  .catch((error) => {
    console.error('PostgreSQL connection error:', error.message);
  });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype === 'application/pdf') {
      return callback(null, true);
    }

    return callback(new Error('Only PDF files are allowed.'));
  }
});

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is missing from .env');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  let parser = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Resume PDF file is required.'
      });
    }

    const jobText = req.body.jobDescription;

    if (!jobText || !jobText.trim()) {
      return res.status(400).json({
        error: 'Job description text is required.'
      });
    }

    parser = new PDFParse({
      data: req.file.buffer
    });

    const resumeData = await parser.getText();

    if (!resumeData || !resumeData.text || !resumeData.text.trim()) {
      return res.status(400).json({
        error: 'Could not extract text from the resume PDF.'
      });
    }

    const prompt = `
Compare the following resume with the job description.

Return ONLY a valid JSON object with exactly these keys:

{
  "matchScore": 0,
  "summary": "",
  "gaps": [],
  "recommendations": []
}

Rules:
- matchScore must be an integer between 0 and 100.
- summary must be a concise explanation of the candidate's fit.
- gaps must be an array of missing skills, technologies, qualifications, or keywords.
- recommendations must be an array of actionable improvement suggestions.
- Do not include Markdown.
- Do not include code fences.
- Return valid JSON only.

RESUME:

${resumeData.text}

JOB DESCRIPTION:

${jobText}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText =
      typeof response.text === 'function'
        ? response.text()
        : response.text;

    if (!responseText) {
      throw new Error('Gemini returned an empty response.');
    }

    let analysisResult;

    try {
      analysisResult = JSON.parse(responseText);
    } catch (error) {
      console.error('Gemini JSON parsing error:', error.message);
      console.error('Gemini response:', responseText);

      return res.status(500).json({
        error: 'AI returned an invalid response.'
      });
    }

    if (
      typeof analysisResult.matchScore !== 'number' ||
      typeof analysisResult.summary !== 'string' ||
      !Array.isArray(analysisResult.gaps) ||
      !Array.isArray(analysisResult.recommendations)
    ) {
      throw new Error('Invalid analysis format returned by Gemini.');
    }

    const matchScore = Math.max(
      0,
      Math.min(100, Math.round(analysisResult.matchScore))
    );

    const query = `
      INSERT INTO analyses (
        job_title,
        match_score,
        summary,
        gaps,
        recommendations
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
      RETURNING *;
    `;

    const values = [
      jobText.trim().substring(0, 255),
      matchScore,
      analysisResult.summary,
      JSON.stringify(analysisResult.gaps),
      JSON.stringify(analysisResult.recommendations)
    ];

    const dbResponse = await pool.query(query, values);
    const savedAnalysis = dbResponse.rows[0];

    return res.json({
      id: savedAnalysis.id,
      matchScore: savedAnalysis.match_score,
      summary: savedAnalysis.summary,
      gaps: savedAnalysis.gaps,
      recommendations: savedAnalysis.recommendations,
      created_at: savedAnalysis.created_at
    });
  } catch (error) {
    console.error('Analysis error:', error);

    return res.status(500).json({
      error: 'Failed to process resume analysis.',
      details:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
    });
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (error) {
        console.error('PDF parser cleanup error:', error.message);
      }
    }
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM analyses
      ORDER BY created_at DESC
      LIMIT 15
    `);

    return res.json(rows);
  } catch (error) {
    console.error('Database history error:', error);

    return res.status(500).json({
      error: 'Failed to fetch scan history.'
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT current_database(), current_user
    `);

    return res.json({
      status: 'ok',
      database: 'connected',
      databaseName: result.rows[0].current_database,
      user: result.rows[0].current_user
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    return res.status(500).json({
      status: 'error',
      database: 'disconnected'
    });
  }
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Resume file must be smaller than 5MB.'
      });
    }

    return res.status(400).json({
      error: error.message
    });
  }

  if (error.message === 'Only PDF files are allowed.') {
    return res.status(400).json({
      error: error.message
    });
  }

  return res.status(500).json({
    error: 'Internal server error.'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});