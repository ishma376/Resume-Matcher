import io
import os
import re
import httpx
import json
import pydantic
import PyPDF2
import bcrypt
import jwt
import time
import random
from fastapi.responses import StreamingResponse



from docx import Document
from typing import List
from datetime import datetime, timedelta
from google import genai
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient


load_dotenv()
security = HTTPBearer()





# 🎛️ CONFIGURATION & SECURITY SETTINGS

JWT_SECRET = "your-super-hidden-jwt-secret-key"

JWT_ALGORITHM = "HS256"

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("MONGO_URI not found in .env")

client = AsyncIOMotorClient(MONGO_URI)

db = client["matcher"]

users_collection = db["users"] # change name if needed



# =========================================================================

# 🚀 INITIALIZE FASTAPI WITH METADATA

# =========================================================================

app = FastAPI(
    title="⚡ Production-Grade AI Resume Optimizer API",
    description="High-performance, structured ATS resume analysis engine using GPT-4o-mini with secure user authentication.",
    version="2.0.0"
)

origins = [

    "http://localhost:3000",

    "http://127.0.0.1:3000",

]



app.add_middleware(

    CORSMiddleware,

    allow_origins=origins,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)



# Enhanced Security (CORS allowance for Frontend compatibility)



# =========================================================================

# 📦 DATA STRUCTS & PIPELINES (PYDANTIC SCHEMAS)

# =========================================================================

class TargetResumeFormat(BaseModel):
    structure: str = Field(..., description="Optimized section blueprint layout customized for this specific job description")
    suggested_summary: str = Field(..., description="A concise summary tailored directly to the job description.")
    skills_to_add: List[str] = Field(..., description="Missing keywords or skills the candidate should add.")


class AnalysisResult(BaseModel):

    match_score: int = Field(..., ge=0, le=100, description="Overall match percentage against the JD.")
    areas_needed: List[str] = Field(..., description="Direct missing gaps or weak sections in the resume.")
    correctness_checks: List[str] = Field(..., description="Matched items verified against the job description.")
    recommendations: List[str] = Field(..., description="Actionable modification advice.")
    target_resume_format: TargetResumeFormat = Field(..., description="Resume rewrite structure and summary guidance.")



class UserAuthSchema(BaseModel):

    email: EmailStr

    password: str = Field(..., min_length=6, description="Password must be at least 6 characters long")



class UserModel(BaseModel):

    email: str

    hashed_password: str

    google_id: str = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
def generate_with_gemini(client, prompt):
    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            return response.text.strip()

        except Exception as e:
            print(f"Attempt {attempt + 1} failed:", e)

            if attempt < 4:
                time.sleep(2 + random.random())

    raise Exception("Gemini overloaded. Try again later.")

def stream_ats_analysis(client, prompt, job_description, resume_text):
    yield "🔄 Reading resume...\n"

    time.sleep(1)

    yield "🧠 Extracting skills...\n"

    time.sleep(1)

    yield "📄 Comparing with job description...\n"

    time.sleep(1)

    yield "⚙️ Running Gemini analysis...\n"

    raw_content = generate_with_gemini(client, prompt)

    yield "📊 Finalizing results...\n"

    time.sleep(1)

    yield raw_content
# =========================================================================

# 🛠️ UTILITY CORE HELPERS

# =========================================================================
def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PyPDF2.PdfReader(pdf_file)

        print("Pages:", len(reader.pages))

        extracted_text = ""

        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()

            print(f"\n----- PAGE {i+1} -----")
            print(repr(page_text))

            if page_text:
                extracted_text += page_text + "\n"

        return extracted_text.strip()

    except Exception as e:
        print(f"--- PDF READER INNER CRASH: {str(e)} ---")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse PDF content: {str(e)}"
        )
    
def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))

        text = []

        for para in doc.paragraphs:
            text.append(para.text)

        return "\n".join(text)

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse DOCX content: {str(e)}"
        )
# =========================================================================

# 🔐 AUTHENTICATION ENDPOINTS (SIGN UP / SIGN IN)

# =========================================================================

@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)

async def signup(user_data: UserAuthSchema):

    existing_user = await users_collection.find_one({"email": user_data.email})

    if existing_user:

        raise HTTPException(

            status_code=status.HTTP_400_BAD_REQUEST, 

            detail="An account with this email already exists."

        )

    

    salt = bcrypt.gensalt()

    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), salt).decode('utf-8')

    

    new_user = {

        "email": user_data.email,

        "hashed_password": hashed_password,

        "google_id": None,

        "created_at": datetime.utcnow()

    }

    

    await users_collection.insert_one(new_user)

    return {"message": "Registration successful! Proceed to Sign In."}



@app.post("/api/auth/signin")

async def signin(user_data: UserAuthSchema):

    user = await users_collection.find_one({"email": user_data.email})

    if not user:

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED, 

            detail="Invalid Email or Password"

        )

    

    password_match = bcrypt.checkpw(

        user_data.password.encode('utf-8'), 

        user["hashed_password"].encode('utf-8')

    )

    

    if not password_match:

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED, 

            detail="Invalid Email or Password"

        )

    

    token_expiry = datetime.utcnow() + timedelta(days=1)

    session_token = jwt.encode(

        {"email": user["email"], "exp": token_expiry}, 

        JWT_SECRET, 

        algorithm=JWT_ALGORITHM

    )

    

    return {"status": "authenticated", "token": session_token}



# =========================================================================

# 🧠 AI ANALYSIS PROCESSING CORE ENDPOINT

@app.post("/api/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...)
):
    try:
        allowed_extensions = ('.pdf', '.docx')

        if not resume.filename.lower().endswith(allowed_extensions):
            raise HTTPException(
                status_code=400,
                detail="Only PDF and DOCX files are supported."
            )

        file_bytes = await resume.read()

        if resume.filename.lower().endswith(".pdf"):
            extracted_resume_text = extract_text_from_pdf(file_bytes)

        elif resume.filename.lower().endswith(".docx"):
            extracted_resume_text = extract_text_from_docx(file_bytes)
        print("FILE NAME:", resume.filename)
        print("TEXT LENGTH:", len(extracted_resume_text))
        print("TEXT PREVIEW:", repr(extracted_resume_text[:200]))

        print(f"\n--- SUCCESS: Extracted {len(extracted_resume_text)} characters ---\n")

        if not extracted_resume_text or len(extracted_resume_text.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="Could not extract readable text from the uploaded file."
            )

        # ... The rest of your prompt and OpenAI completions logic continues below ...

        # Strict analytical prompt structure configuration
        analysis_prompt = f"""
You are a strict, deterministic Applicant Tracking System (ATS) scoring engine.

Your job is to compare a Candidate Resume against a Target Job Description and produce a highly factual, evidence-based analysis.

You MUST follow these rules:

========================
1. CORE RULES
========================
- Use ONLY the provided Resume and Job Description.
- Do NOT assume missing skills exist.
- Do NOT hallucinate technologies, certifications, or experience.
- Every claim must be traceable to text evidence.
- Be strict: partial matches are NOT full matches.

========================
2. SCORING SYSTEM (IMPORTANT)
========================
Compute match_score (0–100) using this breakdown:

A. Must-have skills (40%)
   - If missing critical required skills → heavy penalty
   - If partially present → partial credit only (max 50% of category)

B. Relevant experience match (25%)
   - Direct role/industry alignment
   - Internship/project relevance

C. Technical skill overlap (20%)
   - Exact keyword matches only count fully
   - Similar but not identical skills = partial credit

D. Tools & technologies (10%)
   - Frameworks, libraries, platforms match

E. Education & certifications alignment (5%)
   - Only if explicitly relevant in JD

FINAL RULE:
- If more than 50% of must-have skills are missing → score MUST NOT exceed 50

========================
3. GAP ANALYSIS RULES
========================
- "areas_needed" must list ONLY missing or weak skills from JD
- Do NOT repeat resume content
- Be specific (use exact JD phrases)

========================
4. MATCH VERIFICATION RULES
========================
- "correctness_checks" must include ONLY confirmed matches
- Each item must be backed by resume text evidence

========================
5. RECOMMENDATIONS RULES
========================
- Must be actionable (not generic advice)
- Must directly map missing skills → learning or improvement steps
- No motivational language

========================
6. RESUME IMPROVEMENT OUTPUT RULES
========================
- "skills_to_add" must ONLY come from JOB DESCRIPTION keywords
- Do NOT invent new skills

========================
INPUTS
========================

TARGET JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{extracted_resume_text}

========================
OUTPUT FORMAT (STRICT JSON ONLY)
========================

{{
  "match_score": 0,
  "areas_needed": ["Missing or weak requirement based strictly on JD"],
  "correctness_checks": ["Verified match with evidence from resume"],
  "recommendations": ["Concrete improvement steps mapped to JD gaps"],
  "target_resume_format": {{
    "structure": "Best ATS-friendly section order tailored to this job",
    "suggested_summary": "2-sentence factual summary based ONLY on resume + JD alignment",
    "skills_to_add": ["Exact missing keywords from job description"]
  }}
}}
"""

        

        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        raw_content = generate_with_gemini(client, analysis_prompt)




        print("RAW GEMINI RESPONSE:")
        print(raw_content)

        cleaned = raw_content.strip()

        if cleaned.startswith("```json"):
            cleaned = cleaned.replace("```json", "", 1)

        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```", "", 1)

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        cleaned = cleaned.strip()

        print("CLEANED RESPONSE:")
        print(cleaned)

        return json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="LLM engine returned an unparseable response structure.")
    except Exception as e:
        # This print block outputs the exact API error to your terminal console window
        print("\n=== CRITICAL BACKEND ERROR ===")
        print(str(e))
        print("==============================\n")
        raise HTTPException(status_code=500, detail=f"Core Analysis Exception: {str(e)}")

# =========================================================================

# 🩺 SERVICE HEALTH VERIFICATION

# =========================================================================

@app.get("/health", status_code=status.HTTP_200_OK)

def health_check():

    return {"status": "healthy", "service": "Resume Core Engine"}



# =========================================================================

# 🌐 GOOGLE OAUTH VALIDATION ENDPOINT





@app.post("/api/auth/google")

async def google_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):

    access_token = credentials.credentials

    

    async with httpx.AsyncClient() as client:

        google_response = await client.get(

            f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"

        )

        

    if google_response.status_code != 200:

        # 👇 THESE LINES ARE ADDED HERE RIGHT INSIDE THE IF-STATEMENT:

        print(f"--- GOOGLE REJECTION STATUS: {google_response.status_code} ---")

        print(f"--- GOOGLE REJECTION DETAIL: {google_response.text} ---")

        

        raise HTTPException(

            status_code=status.HTTP_401_UNAUTHORIZED,

            detail="Invalid Google Access Token"

        )

        

    user_info = google_response.json()

    return {"status": "success", "user": user_info}

    



    

    user = await users_collection.find_one({"email": user_email})

    if not user:

        user_doc = {

            "email": user_email,

            "hashed_password": "OAUTH_EXTERNAL_USER",

            "google_id": google_user_id,

            "created_at": datetime.utcnow()

        }

        await users_collection.insert_one(user_doc)

    return {"status": "authenticated", "token": session_token}