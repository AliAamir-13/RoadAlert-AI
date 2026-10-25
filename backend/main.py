import base64
import datetime
import io
import os
import re
from typing import Optional
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from google import genai
from google.genai import types
from PIL import Image

# Hardcoded API key variable as required (falls back to environment variable if set)
API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")

app = FastAPI(
    title="RoadAlert AI Backend",
    description="Backend API for civic issue reporting and complaint letter generation",
    version="1.0.0"
)

# Enable CORS for localhost:3000 and standard development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_INSTRUCTION = """You are an expert civic infrastructure inspector and official government liaison for RoadAlert AI.
Analyze the provided photograph of a civic road hazard or public infrastructure defect (e.g., pothole, broken streetlight, open manhole, waterlogging, damaged sidewalk, illegal debris).

You MUST respond strictly using the following exact format and headers. Do not include markdown code fences or conversational greetings.

ISSUE_IDENTIFIED: [problem in 5 words or less]
DANGER_LEVEL: [Low/Medium/High/Critical]
DANGER_REASON: [one concise sentence explaining the immediate hazard to vehicles, cyclists, or pedestrians]
PROBLEM_DESCRIPTION: [2-3 objective, professional sentences describing the physical dimensions, road damage condition, and risk of escalation]
COMPLAINT_BODY: [formal letter body paragraphs only, in the requested language (English or Hindi). If English, start with "I wish to bring to your immediate attention...". If Hindi, write in formal Devanagari script starting with "मैं आपका ध्यान तुरंत..." or "सविनय निवेदन है कि...". Maintain a polite yet assertive, legally sound official tone.]
DEPARTMENT: [responsible municipal or government department, e.g., Public Works Department (PWD), Municipal Corporation Road Maintenance Wing, Traffic Engineering Cell, Electricity Board, or Jal Nigam / Sewerage Board]
"""

def parse_gemini_output(text: str) -> dict:
    """Parses key-value fields from Gemini structured output."""
    fields = {
        "issue_identified": "Damaged Road Infrastructure",
        "danger_level": "High",
        "danger_reason": "Presents immediate hazard to vehicular traffic and pedestrians.",
        "problem_description": "A serious civic defect was detected at this location requiring urgent repair.",
        "complaint_body": "I wish to bring to your immediate attention a severe infrastructure issue that poses an ongoing threat to public safety.",
        "department": "Public Works Department (PWD) / Municipal Corporation"
    }

    # Match patterns with or without markdown bold asterisks
    patterns = {
        "issue_identified": r"(?:^|\n)\*?\*?ISSUE_IDENTIFIED\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)",
        "danger_level": r"(?:^|\n)\*?\*?DANGER_LEVEL\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)",
        "danger_reason": r"(?:^|\n)\*?\*?DANGER_REASON\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)",
        "problem_description": r"(?:^|\n)\*?\*?PROBLEM_DESCRIPTION\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)",
        "complaint_body": r"(?:^|\n)\*?\*?COMPLAINT_BODY\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)",
        "department": r"(?:^|\n)\*?\*?DEPARTMENT\*?\*?:\s*(.+?)(?=\n\*?\*?[A-Z_]+:|$)",
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            val = match.group(1).strip()
            # Clean up residual asterisks
            val = val.strip("*_ \t")
            if val:
                fields[key] = val

    # Normalize danger level
    dl = fields["danger_level"].capitalize()
    if "Critical" in dl:
        fields["danger_level"] = "Critical"
    elif "High" in dl:
        fields["danger_level"] = "High"
    elif "Medium" in dl:
        fields["danger_level"] = "Medium"
    elif "Low" in dl:
        fields["danger_level"] = "Low"
    else:
        fields["danger_level"] = "High"

    return fields

def generate_docx(fields: dict, location: str, language: str) -> str:
    """Generates a formal .docx complaint letter and returns base64 encoded string."""
    doc = Document()

    # Set document margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    # 1. RoadAlert AI Letterhead in red (#D62B2B -> RGB 214, 43, 43)
    header_p = doc.add_paragraph()
    header_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_brand = header_p.add_run("ROADALERT AI")
    run_brand.font.name = "Arial"
    run_brand.font.size = Pt(20)
    run_brand.bold = True
    run_brand.font.color.rgb = RGBColor(214, 43, 43) # #D62B2B

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = sub_p.add_run("CIVIC INFRASTRUCTURE SURVEILLANCE & CITIZEN GRIEVANCE PORTAL\nOfficial Public Hazard Notice & Administrative Petition")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(8.5)
    run_sub.font.color.rgb = RGBColor(100, 100, 100)

    # Separator rule line
    rule_p = doc.add_paragraph()
    rule_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_rule = rule_p.add_run("—" * 58)
    r_rule.font.color.rgb = RGBColor(214, 43, 43)
    r_rule.bold = True

    # 2. Date (Auto today's date)
    today_str = datetime.date.today().strftime("%B %d, %Y")
    date_p = doc.add_paragraph()
    date_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run_date = date_p.add_run(f"Date: {today_str}")
    run_date.font.name = "Arial"
    run_date.font.size = Pt(10)
    run_date.bold = True

    # 3. To address block with department name
    to_p = doc.add_paragraph()
    to_run = to_p.add_run("To,\n")
    to_run.bold = True
    
    dept_run = to_p.add_run(f"The Chief / Executive Engineer,\n{fields['department']},\n")
    dept_run.bold = True
    
    loc_run = to_p.add_run(f"Jurisdiction / Ward: {location}\nMunicipal Administration & Public Works Authority")
    to_p.paragraph_format.line_spacing = 1.15
    to_p.paragraph_format.space_after = Pt(12)

    # 4. Bold underlined subject line
    subj_p = doc.add_paragraph()
    subj_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    subj_title = subj_p.add_run("SUBJECT: ")
    subj_title.bold = True
    subj_title.underline = True
    
    subj_text = subj_p.add_run(f"URGENT REPORT & REPAIR REQUISITION - {fields['issue_identified'].upper()} AT {location.upper()}")
    subj_text.bold = True
    subj_text.underline = True
    subj_p.paragraph_format.space_after = Pt(12)

    # 5. Salutation
    sal_p = doc.add_paragraph()
    if language.lower() == "hindi":
        sal_run = sal_p.add_run("महोदय / महोदया,")
    else:
        sal_run = sal_p.add_run("Respected Sir / Madam,")
    sal_run.bold = True
    sal_p.paragraph_format.space_after = Pt(8)

    # 6. Danger assessment line in color
    # Critical=red, High=orange, Medium=yellow/amber, Low=green
    danger_colors = {
        "Critical": RGBColor(214, 43, 43),    # Red
        "High": RGBColor(234, 88, 12),        # Orange
        "Medium": RGBColor(202, 138, 4),      # Yellow/Amber
        "Low": RGBColor(22, 163, 74)          # Green
    }
    danger_color = danger_colors.get(fields["danger_level"], RGBColor(214, 43, 43))

    danger_p = doc.add_paragraph()
    danger_label = danger_p.add_run("[DANGER ASSESSMENT - ")
    danger_label.bold = True
    danger_label.font.size = Pt(10.5)

    level_run = danger_p.add_run(fields["danger_level"].upper())
    level_run.bold = True
    level_run.font.size = Pt(11)
    level_run.font.color.rgb = danger_color

    danger_desc = danger_p.add_run(f": {fields['danger_reason']}]")
    danger_desc.bold = True
    danger_desc.font.size = Pt(10.5)
    danger_p.paragraph_format.space_after = Pt(12)

    # 7. Problem Description paragraph
    desc_p = doc.add_paragraph()
    desc_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    desc_label = desc_p.add_run("Condition Overview: ")
    desc_label.bold = True
    desc_body = desc_p.add_run(fields["problem_description"])
    desc_p.paragraph_format.line_spacing = 1.2
    desc_p.paragraph_format.space_after = Pt(10)

    # 8. Body paragraphs justified
    body_paragraphs = fields["complaint_body"].split("\n\n")
    for para in body_paragraphs:
        clean_para = para.strip()
        if not clean_para:
            continue
        bp = doc.add_paragraph()
        bp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        b_run = bp.add_run(clean_para)
        b_run.font.size = Pt(10.5)
        bp.paragraph_format.line_spacing = 1.25
        bp.paragraph_format.space_after = Pt(10)

    # 9. Demand / Closing action paragraph
    action_p = doc.add_paragraph()
    action_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if language.lower() == "hindi":
        action_run = action_p.add_run("अतः आपसे विनम्र अनुरोध है कि जनहित एवं सड़क सुरक्षा को ध्यान में रखते हुए इस समस्या का त्वरित संज्ञान लें तथा संबंधित कार्य दल को तत्काल आवश्यक मरम्मत कार्य हेतु निर्देशित करें।")
    else:
        action_run = action_p.add_run("Therefore, in the interest of public safety and vehicle transit integrity, you are urgently requested to inspect the aforementioned site and deploy a maintenance crew for immediate remedial action without further delay.")
    action_p.paragraph_format.line_spacing = 1.2
    action_p.paragraph_format.space_after = Pt(18)

    # 10. Closing and signature
    close_p = doc.add_paragraph()
    if language.lower() == "hindi":
        close_p.add_run("सधन्यवाद,\n\nभवदीय,\n")
    else:
        close_p.add_run("Yours faithfully,\n\n")
    
    sig_run = close_p.add_run("[Citizen Complainant / Vigilant Resident]\n")
    sig_run.bold = True
    
    org_run = close_p.add_run("Transmitted via RoadAlert AI - Public Infrastructure Surveillance System\nLocation: " + location)
    org_run.font.size = Pt(9)
    org_run.font.color.rgb = RGBColor(120, 120, 120)

    # Save to buffer and base64 encode
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "RoadAlert AI Backend",
        "version": "1.0.0"
    }

@app.post("/analyze")
async def analyze_civic_issue(
    image: UploadFile = File(...),
    location: str = Form(...),
    language: str = Form("English")
):
    """
    Analyzes an uploaded road hazard image using Google Gemini Vision,
    extracts structured civic metrics, and produces an official .docx complaint petition.
    """
    if not image:
        raise HTTPException(status_code=400, detail="An image file is required.")
    
    # Read image contents
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    mime_type = image.content_type or "image/jpeg"
    
    # Validate image with Pillow
    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img.verify()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

    # Prompt text for Gemini
    user_prompt = f"""Civic Issue Report Details:
- Geographic Location: {location}
- Preferred Response Language for Complaint Body: {language}

Please inspect the attached photograph thoroughly and generate the structured civic assessment following the required template."""

    gemini_key = API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if not gemini_key or gemini_key == "YOUR_GEMINI_API_KEY_HERE":
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the server. Please ensure the API key is set."
        )

    try:
        client = genai.Client(api_key=gemini_key)
        
        # Prepare multimodal content part
        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type,
        )

        # Call Gemini model (gemini-2.0-flash or gemini-2.5-flash)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[image_part, user_prompt],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.2,
            )
        )

        response_text = response.text or ""
        parsed_fields = parse_gemini_output(response_text)

        # Generate the official .docx complaint document
        docx_b64 = generate_docx(parsed_fields, location=location, language=language)

        return {
            "success": True,
            "issue_identified": parsed_fields["issue_identified"],
            "danger_level": parsed_fields["danger_level"],
            "danger_reason": parsed_fields["danger_reason"],
            "problem_description": parsed_fields["problem_description"],
            "complaint_body": parsed_fields["complaint_body"],
            "department": parsed_fields["department"],
            "location": location,
            "language": language,
            "docx_base64": docx_b64,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(exc)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
