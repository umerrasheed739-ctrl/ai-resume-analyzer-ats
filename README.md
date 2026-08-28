# 🤖 AI Resume Analyzer & ATS Optimizer

An AI-powered web application that analyzes resume PDFs against Job Descriptions (JDs), provides ATS keyword match scores, delivers detailed requirement evaluations, and features an AI CV Auto-Rewriter with integrated Stripe payments.

---

## ⚡ Features

- **PDF Parsing & Analysis:** Extracts text directly from uploaded resume PDFs.
- **ATS Match Score:** Evaluates missing/matched skills and provides actionable improvement advice.
- **Job Requirements Check:** Automatically verifies experience and education eligibility against the JD.
- **AI CV Auto-Rewriter:** Rewrites resume bullet points using Gemini AI to match target JDs.
- **Stripe Payment Gateway:** Integrated Pro upgrade checkout flow for unlimited AI rewrites.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, Tailwind CSS, Vite
- **Backend:** Node.js, Express.js
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Payments:** Stripe API (`@stripe/stripe-js`)
- **File Handling:** Multer, `pdf-parse`

---

## 🚀 Getting Started Locally

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/ai-resume-analyzer.git](https://github.com/YOUR_USERNAME/ai-resume-analyzer.git)
cd ai-resume-analyzer/my-app
2. Install Dependencies
Bash
npm install
3. Environment Setup
Create a .env file in the root of my-app directory and add the following keys:

Code snippet
GEMINI_API_KEY=your_gemini_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
PORT=3000
4. Run the Application
Start the Express backend server:

Bash
node server.js
In a new terminal window, start the React frontend app:

Bash
npm run dev
Open http://localhost:5173 in your browser to view the application.