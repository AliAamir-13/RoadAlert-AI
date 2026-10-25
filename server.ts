import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } from 'docx';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `You are an expert civic infrastructure inspector and official government liaison for RoadAlert AI.
Analyze the provided photograph of a civic road hazard or public infrastructure defect (e.g., pothole, broken streetlight, open manhole, waterlogging, damaged sidewalk, dangerous road debris).

You MUST respond strictly using the following exact format and headers. Do not include markdown code fences or conversational greetings.

ISSUE_IDENTIFIED: [problem in 5 words or less]
DANGER_LEVEL: [Low/Medium/High/Critical]
DANGER_REASON: [one concise sentence explaining the immediate hazard to vehicles, cyclists, or pedestrians]
PROBLEM_DESCRIPTION: [2-3 objective, professional sentences describing the physical dimensions, road damage condition, and risk of escalation]
COMPLAINT_BODY: [formal letter body paragraphs only, in the requested language (English or Hindi). If English, start with "I wish to bring to your immediate attention...". If Hindi, write in formal Devanagari script starting with "मैं आपका ध्यान तुरंत..." or "सविनय निवेदन है कि...". Maintain a polite yet assertive, legally sound official tone.]
DEPARTMENT: [responsible municipal or government department, e.g., Public Works Department (PWD), Municipal Corporation Road Maintenance Wing, Traffic Engineering Cell, Electricity Board, or Jal Nigam / Sewerage Board]`;

function parseGeminiOutput(text: string) {
  const fields = {
    issue_identified: 'Damaged Road Infrastructure',
    danger_level: 'High',
    danger_reason: 'Presents immediate hazard to vehicular traffic and pedestrians.',
    problem_description: 'A serious civic defect was detected at this location requiring urgent repair.',
    complaint_body: 'I wish to bring to your immediate attention a severe infrastructure issue that poses an ongoing threat to public safety.',
    department: 'Public Works Department (PWD) / Municipal Corporation',
  };

  const patterns: Record<keyof typeof fields, RegExp> = {
    issue_identified: /(?:^|\n)\*?\*?ISSUE_IDENTIFIED\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)/is,
    danger_level: /(?:^|\n)\*?\*?DANGER_LEVEL\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)/is,
    danger_reason: /(?:^|\n)\*?\*?DANGER_REASON\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)/is,
    problem_description: /(?:^|\n)\*?\*?PROBLEM_DESCRIPTION\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)/is,
    complaint_body: /(?:^|\n)\*?\*?COMPLAINT_BODY\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)/is,
    department: /(?:^|\n)\*?\*?DEPARTMENT\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)/is,
  };

  for (const [key, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleaned = match[1].trim().replace(/^[*_\s]+|[*_\s]+$/g, '');
      if (cleaned) {
        fields[key as keyof typeof fields] = cleaned;
      }
    }
  }

  // Normalize danger level
  const dl = fields.danger_level.toLowerCase();
  if (dl.includes('critical')) fields.danger_level = 'Critical';
  else if (dl.includes('high')) fields.danger_level = 'High';
  else if (dl.includes('medium')) fields.danger_level = 'Medium';
  else if (dl.includes('low')) fields.danger_level = 'Low';
  else fields.danger_level = 'High';

  return fields;
}

async function buildDocxBase64(fields: ReturnType<typeof parseGeminiOutput>, location: string, language: string): Promise<string> {
  const isHindi = language.toLowerCase().includes('hindi');
  
  const dangerColors: Record<string, string> = {
    Critical: 'D62B2B', // Red
    High: 'EA580C',     // Orange
    Medium: 'CA8A04',   // Amber
    Low: '16A34A',      // Green
  };
  const dangerColorHex = dangerColors[fields.danger_level] || 'D62B2B';

  const todayStr = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const bodyParagraphs = fields.complaint_body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1152, // 0.8 in
              bottom: 1152,
              left: 1224, // 0.85 in
              right: 1224,
            },
          },
        },
        children: [
          // 1. RoadAlert AI Letterhead in red (#D62B2B)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'ROADALERT AI',
                bold: true,
                size: 38, // 19pt
                color: 'D62B2B',
                font: 'Arial',
              }),
            ],
            spacing: { after: 60 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CIVIC INFRASTRUCTURE SURVEILLANCE & CITIZEN GRIEVANCE PORTAL',
                bold: true,
                size: 16,
                color: '4B5563',
                font: 'Arial',
              }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Official Public Hazard Notice & Administrative Petition Under Municipal Safety Guidelines',
                italics: true,
                size: 15,
                color: '6B7280',
                font: 'Arial',
              }),
            ],
            spacing: { after: 120 },
          }),
          // Decorative Rule
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '—————————————————————————————————————————————————————————',
                color: 'D62B2B',
                bold: true,
                size: 14,
              }),
            ],
            spacing: { after: 180 },
          }),

          // 2. Date (Auto today's date)
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Date of Notice: ${todayStr}`,
                bold: true,
                size: 20, // 10pt
                font: 'Arial',
              }),
            ],
            spacing: { after: 200 },
          }),

          // 3. To address block with department name
          new Paragraph({
            children: [
              new TextRun({ text: 'To,\n', bold: true, size: 21, font: 'Arial' }),
              new TextRun({ text: 'The Competent / Executive Authority,\n', bold: true, size: 21, font: 'Arial' }),
              new TextRun({ text: `${fields.department},\n`, bold: true, size: 21, font: 'Arial', color: '1F2937' }),
              new TextRun({ text: `Jurisdiction / Location: ${location}\n`, size: 20, font: 'Arial' }),
              new TextRun({ text: 'Municipal Corporation & Public Works Administration', size: 20, font: 'Arial' }),
            ],
            spacing: { after: 220, line: 276 },
          }),

          // 4. Bold underlined subject line
          new Paragraph({
            children: [
              new TextRun({
                text: 'SUBJECT: ',
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                size: 22,
                color: 'D62B2B',
                font: 'Arial',
              }),
              new TextRun({
                text: `URGENT INTERVENTION - CITIZEN REPORT ON ${fields.issue_identified.toUpperCase()} AT ${location.toUpperCase()}`,
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                size: 21,
                font: 'Arial',
              }),
            ],
            spacing: { after: 200, line: 280 },
          }),

          // 5. Salutation
          new Paragraph({
            children: [
              new TextRun({
                text: isHindi ? 'महोदय / महोदया,' : 'Respected Sir / Madam,',
                bold: true,
                size: 21,
                font: 'Arial',
              }),
            ],
            spacing: { after: 140 },
          }),

          // 6. Danger assessment line in color
          new Paragraph({
            children: [
              new TextRun({
                text: 'DANGER ASSESSMENT: ',
                bold: true,
                size: 21,
                font: 'Arial',
              }),
              new TextRun({
                text: `[${fields.danger_level.toUpperCase()}] `,
                bold: true,
                size: 22,
                color: dangerColorHex,
                font: 'Arial',
              }),
              new TextRun({
                text: `— ${fields.danger_reason}`,
                size: 20,
                bold: true,
                color: '374151',
                font: 'Arial',
              }),
            ],
            spacing: { after: 180 },
          }),

          // 7. Problem description
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: 'Technical Condition Overview: ',
                bold: true,
                size: 21,
                font: 'Arial',
              }),
              new TextRun({
                text: fields.problem_description,
                size: 21,
                font: 'Arial',
              }),
            ],
            spacing: { after: 180, line: 280 },
          }),

          // 8. Body paragraphs justified
          ...bodyParagraphs.map(
            (p) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                children: [
                  new TextRun({
                    text: p,
                    size: 21,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 160, line: 290 },
              })
          ),

          // 9. Statutory / Civic Appeal
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: isHindi
                  ? 'अतः आपसे सादर अनुरोध है कि जनहित एवं सार्वजनिक सड़क सुरक्षा की रक्षा हेतु इस मामले पर त्वरित कार्यवाही करते हुए प्राथमिकता के आधार पर मरम्मत व निवारण कार्य पूर्ण कराने की कृपा करें।'
                  : 'Therefore, in the interest of pedestrian safety, vehicular stability, and public hazard mitigation, you are requested to arrange an on-site inspection immediately and direct the designated engineering wing to execute permanent repair without delay.',
                size: 21,
                font: 'Arial',
              }),
            ],
            spacing: { after: 260, line: 280 },
          }),

          // 10. Closing and signature
          new Paragraph({
            children: [
              new TextRun({
                text: isHindi ? 'सधन्यवाद,\n\nभवदीय,\n' : 'Yours faithfully,\n\n',
                size: 21,
                font: 'Arial',
              }),
              new TextRun({
                text: 'Concerned Resident & Citizen Complainant\n',
                bold: true,
                size: 21,
                font: 'Arial',
              }),
              new TextRun({
                text: `Generated via RoadAlert AI System | Location: ${location}\nEnclosure: Geotagged photographic visual evidence attached`,
                size: 17,
                color: '6B7280',
                font: 'Arial',
              }),
            ],
            spacing: { after: 100, line: 260 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer.toString('base64');
}

// Handler for analyzing road issues
async function handleAnalyze(req: express.Request, res: express.Response) {
  try {
    const file = req.file;
    const location = (req.body.location || 'Reported Civic Location').toString().trim();
    const language = (req.body.language || 'English').toString().trim();

    if (!file) {
      return res.status(400).json({ error: 'An image file is required.' });
    }

    const mimeType = file.mimetype || 'image/jpeg';
    const base64Data = file.buffer.toString('base64');

    const userPrompt = `Civic Issue Report Details:
- Geographic Location: ${location}
- Preferred Response Language for Complaint Body: ${language}

Please inspect the attached photograph thoroughly and generate the structured civic assessment following the required template.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: userPrompt,
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    const responseText = response.text || '';
    const parsedFields = parseGeminiOutput(responseText);
    const docxBase64 = await buildDocxBase64(parsedFields, location, language);

    return res.json({
      success: true,
      issue_identified: parsedFields.issue_identified,
      danger_level: parsedFields.danger_level,
      danger_reason: parsedFields.danger_reason,
      problem_description: parsedFields.problem_description,
      complaint_body: parsedFields.complaint_body,
      department: parsedFields.department,
      location: location,
      language: language,
      docx_base64: docxBase64,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error during analysis:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze road hazard photograph.',
    });
  }
}

// Mount /analyze endpoint (and /api/analyze)
app.post('/analyze', upload.single('image'), handleAnalyze);
app.post('/api/analyze', upload.single('image'), handleAnalyze);

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RoadAlert AI server active at http://localhost:${PORT}`);
  });
}

startServer();
