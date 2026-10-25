# RoadAlert AI 🚧
**AI-Powered Civic Issue Reporting & Official Complaint Letter Generator**

RoadAlert AI empowers citizens to photograph civic road hazards (potholes, broken streetlights, open manholes, waterlogging) and automatically generates an authoritative, formatted complaint letter (`.docx`) directed to the responsible municipal or public works department.

---

## 📁 Project Architecture & File Structure

```text
├── backend/
│   ├── main.py              # Single-file FastAPI backend with /analyze endpoint, Gemini vision & python-docx
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── package.json         # Frontend configuration & dependencies
│   └── src/
│       └── App.jsx          # Complete single-file React frontend
├── src/
│   ├── App.tsx              # AI Studio full-stack React application with presets
│   ├── sampleImages.ts      # Sample hazard presets generator for immediate testing
│   ├── main.tsx
│   └── index.css
├── server.ts                # Full-stack Node/Express + Vite proxy server with /analyze endpoint
├── metadata.json
└── package.json
```

---

## 🚀 How to Run

### Option 1: Python FastAPI Backend + React Frontend (Local Setup)

1. **Start the FastAPI Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   export GEMINI_API_KEY="your-gemini-api-key"
   uvicorn main:app --reload --port 8000
   ```

2. **Start the React Frontend**:
   ```bash
   # From root or frontend/ directory:
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` in your browser. The app connects seamlessly to the FastAPI backend!

### Option 2: Live AI Studio Preview (Zero-Config)
The built-in `server.ts` Express full-stack engine runs directly on port 3000 with `@google/genai` and `docx` generating identical output, automatically using your attached Gemini API key.

---

## 🛠 Key Features

- **Multimodal AI Vision**: Inspects road hazard photos using Google Gemini Vision (`gemini-2.0-flash` / `gemini-3.8-flash`).
- **Structured Civic Triage**:
  - `ISSUE_IDENTIFIED`: Concise 5-word problem summary.
  - `DANGER_LEVEL`: Low / Medium / High / Critical with visual color-coded badges.
  - `DANGER_REASON`: Immediate vehicular and pedestrian risk assessment.
  - `PROBLEM_DESCRIPTION`: Technical condition and escalation risk overview.
  - `COMPLAINT_BODY`: Formal petition text drafted in English or Hindi.
  - `DEPARTMENT`: Responsible authority (PWD, Municipal Corporation, Traffic Engineering, Electricity Board, Jal Nigam).
- **Official `.docx` Letterhead Petition**:
  - RoadAlert AI letterhead in `#D62B2B` crimson red
  - Automated current date
  - Official "To" address block with department and jurisdiction
  - Bold underlined subject line
  - Formal administrative salutation (English / Hindi)
  - Color-accented danger assessment block
  - Fully justified body paragraphs
  - Formal citizen closing and signature block
- **Instant Testing Presets**: Built-in samples for potholes, open manholes, and dangling streetlight poles.
