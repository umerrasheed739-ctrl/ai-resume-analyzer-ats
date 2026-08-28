import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

// Stripe SDK Initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Multer Storage Configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Route 1: Initial Resume & JD Analysis (Native Gemini PDF Reader)
app.post('/api/analyze', upload.single('resume'), async (req, res) => {
    try {
        const jobDescription = req.body.jobDescription;
        const pdfFile = req.file;

        if (!pdfFile || !jobDescription) {
            return res.status(400).json({ 
                success: false, 
                error: 'Resume PDF and Job Description are required.' 
            });
        }

        // Convert PDF buffer directly to inline base64 data for Gemini
        const pdfInlineData = {
            inlineData: {
                data: pdfFile.buffer.toString('base64'),
                mimeType: 'application/pdf'
            }
        };

        const prompt = `
You are an expert ATS Resume Analyzer.
Analyze the provided Resume PDF against this Job Description:
"${jobDescription}"

CRITICAL INSTRUCTION FOR REQUIREMENTS EVALUATION:
- Required Experience: Extract strictly from Job Description. If missing, set "Not Specified".
- Candidate Experience: Calculate strictly from Resume. If student/fresh, set "Fresh / 0 Years".
- Required Degree: Extract strictly from Job Description. IF NOT MENTIONED IN JD, YOU MUST RETURN "Not Specified". DO NOT ASSUME OR GUESS DEGREE REQUIREMENTS.
- Degree Match: If no degree is required in JD, return true.

Return ONLY a valid JSON object matching this structure:
{
  "matchPercentage": 80,
  "matchedSkills": ["skill1"],
  "missingSkills": ["skill2"],
  "improvementAdvice": ["advice1"],
  "requirementsCheck": {
    "requiredExperience": "2 Years",
    "candidateExperience": "Fresh / 0 Years",
    "experienceMatch": false,
    "requiredDegree": "Not Specified",
    "candidateDegree": "BS Computer Science (In Progress)",
    "degreeMatch": true
  }
}
`;
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [prompt, pdfInlineData],
            config: { responseMimeType: 'application/json' }
        });

        const resultJson = JSON.parse(response.text);

        res.json({
            success: true,
            data: resultJson
        });

    } catch (error) {
        console.error('Analysis Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route 2: CV Regeneration / Auto-Rewrite
app.post('/api/regenerate-cv', async (req, res) => {
    try {
        const { missingSkills, improvementAdvice } = req.body;

        const prompt = `
        Rewrite high-impact, ATS-friendly resume bullet points for a developer.
        Incorporate these missing skills: ${missingSkills ? missingSkills.join(', ') : 'N/A'}.
        Apply these improvements: ${improvementAdvice ? improvementAdvice.join(', ') : 'N/A'}.
        
        Provide 4-5 copy-paste ready bullet points using action verbs and quantified impact.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt
        });

        res.json({
            success: true,
            optimizedBulletPoints: response.text
        });

    } catch (error) {
        console.error('Regeneration Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route 3: Stripe Payment Intent Endpoint
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount || 50000, // 500 PKR (Stripe calculates in sub-units, e.g. 50000 = PKR 500.00)
            currency: 'pkr',
            payment_method_types: ['card'],
        });

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('Stripe Payment Intent Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

app.listen(port, () => {
    console.log(`Express server running on http://localhost:${port}`);
});