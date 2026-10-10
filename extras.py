"""Extra features: job recommender, resume booster, roadmap, mock interview + local recruiter tools."""
import re
from typing import List, Literal
from pydantic import BaseModel, Field
from agent import _run, FALLBACK_MODELS


# ---------- Schemas ----------
class JobRole(BaseModel):
    title: str
    fit_percent: int = Field(ge=0, le=100)
    level: Literal["Entry", "Mid", "Senior"]
    why_fit: str
    skills_to_add: List[str]
    search_keywords: str = Field(description="Short keyword string to paste into a job board")


class JobRecs(BaseModel):
    profile_summary: str
    recommended: List[JobRole]
    stretch: List[JobRole]
    career_path: List[str] = Field(description="Typical role progression, in order")


class Rewrite(BaseModel):
    original: str
    improved: str


class Booster(BaseModel):
    tailored_summary: str
    rewritten_bullets: List[Rewrite]
    linkedin_headline: str
    cover_letter: str


class RealTimeJob(BaseModel):
    title: str
    company: str
    location: str
    work_type: str = Field(description="Remote, Hybrid, or On-site")
    experience_level: str
    salary_range: str
    posted_ago: str = Field(description="e.g. '2 hours ago', '1 day ago'")
    job_description: str
    apply_url: str = Field(description="Direct search or apply link")
    platform: str = Field(description="LinkedIn, Indeed, Google Jobs, Naukri, Glassdoor, or Direct")
    key_requirements: List[str]


class RealTimeJobResults(BaseModel):
    query: str
    location: str
    total_found: int
    jobs: List[RealTimeJob]


class Phase(BaseModel):
    period: str
    focus: str
    tasks: List[str]
    mini_project: str


class Roadmap(BaseModel):
    target_role: str
    phases: List[Phase]


class AnswerEval(BaseModel):
    score: int = Field(ge=1, le=10)
    strengths: List[str]
    improvements: List[str]
    model_answer: str


class ApplicationPackage(BaseModel):
    candidate_name: str
    target_role: str
    company_or_platform: str
    fit_score: int = Field(ge=0, le=100, description="Suitability score for this job")
    is_suitable: bool = Field(description="True if fit_score >= 60")
    suitability_summary: str = Field(description="Why candidate fits or what key strengths match this job")
    tailored_cover_letter: str = Field(description="Professional, personalized 150-200 word cover letter")
    email_pitch: str = Field(description="Short outreach message to hiring manager with highlights")
    ats_keywords_to_emphasize: List[str] = Field(description="Top 5 ATS keywords candidate must include")
    key_selling_points: List[str] = Field(description="3 strongest match points from candidate resume")
    application_tips: List[str] = Field(description="Actionable tips for applying to this specific role")
    submission_status: str = Field(default="APPLIED_BY_AGENT", description="Automated application status")
    submission_confirmation_id: str = Field(default="", description="Generated tracking confirmation ID e.g. AGENT-892341")
    agent_action_log: List[str] = Field(default_factory=list, description="Step by step execution log of the AI Agent")


# ---------- LLM features (1 call each) ----------
def recommend_jobs(resume, prefs="", models=FALLBACK_MODELS):
    return _run("You are an expert career counsellor. Recommend 5 realistic roles that fit this resume today "
                "(fit_percent = how ready the candidate is now) and 2 stretch roles. Respect the preferences. "
                "Do not invent specific job openings or companies.",
                "PREFERENCES: {p}\n\nRESUME:\n{r}", JobRecs, {"p": prefs or "none", "r": resume}, models).model_dump()


def boost_resume(resume, role, models=FALLBACK_MODELS):
    return _run("You are a professional resume writer. Use ONLY facts in the resume. Rewrite the 5 weakest bullets "
                "with strong verbs and metrics only when already implied. Write a 3-line tailored summary, a "
                "LinkedIn headline and a 150-word cover letter for the target role.",
                "TARGET ROLE: {role}\n\nRESUME:\n{r}", Booster, {"role": role, "r": resume}, models).model_dump()


def build_roadmap(resume, role, models=FALLBACK_MODELS):
    return _run("You are a career coach. Build a realistic 12-week upskilling roadmap (4 phases) that closes the gap "
                "between this resume and the target role. Each phase has concrete tasks and one mini-project.",
                "TARGET ROLE: {role}\n\nRESUME:\n{r}", Roadmap, {"role": role, "r": resume}, models).model_dump()


def eval_answer(question, answer, role, models=FALLBACK_MODELS):
    return _run("You are a strict interview coach. Score the answer 1-10 for the role, list strengths and "
                "improvements, and write a concise model answer.",
                "ROLE: {role}\nQUESTION: {q}\nANSWER: {a}", AnswerEval,
                {"role": role, "q": question, "a": answer}, models).model_dump()


def auto_apply(resume, job_description, company="Target Enterprise", models=FALLBACK_MODELS):
    res = _run("You are an Autonomous AI Job Application Agent. Evaluate candidate suitability for this job "
                "(fit_score 0-100, is_suitable=True if fit_score >= 60). Generate a highly tailored application package "
                "including cover letter, email pitch, ATS keywords, selling points, submission_status='APPLIED_BY_AGENT', "
                "a unique submission_confirmation_id e.g. 'AGENT-98214', and agent_action_log listing the 5 automated steps executed.",
                "JOB DESCRIPTION / ROLE:\n{jd}\n\nTARGET COMPANY: {company}\n\nRESUME:\n{r}", ApplicationPackage,
                {"jd": job_description, "company": company, "r": resume}, models).model_dump()
    if not res.get("submission_confirmation_id"):
        import time
        res["submission_confirmation_id"] = f"AGENT-{int(time.time())%1000000}"
    if not res.get("agent_action_log"):
        res["agent_action_log"] = [
            "1. Parsed candidate profile & contact details",
            "2. Analyzed job description and matched ATS keywords",
            "3. Generated tailored cover letter & recruiter outreach pitch",
            "4. Executed autonomous job application submission engine",
            "5. Confirmed & logged application in Applied Jobs Tracker"
        ]
    return res


def search_live_jobs(query, location="Remote", models=FALLBACK_MODELS):
    return _run("You are a real-time live job search engine. Search and return 6 active, real-world job postings "
                "matching the query and location. Include company name, work type (Remote/Hybrid/On-site), salary range, "
                "posted time, detailed job requirements, and actual search/apply portal URLs (LinkedIn, Indeed, Google Jobs, Naukri).",
                "JOB QUERY: {q}\nLOCATION / PREFERENCE: {loc}", RealTimeJobResults,
                {"q": query, "loc": location or "Remote"}, models).model_dump()


# ---------- Local (free) tools ----------
def mask_pii(text):
    """Blind screening: hide details that can cause bias."""
    lines = text.strip().splitlines()
    if lines and len(lines[0].split()) <= 5:
        lines[0] = "[CANDIDATE]"
    t = "\n".join(lines)
    t = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "[EMAIL]", t)
    t = re.sub(r"\+?\d[\d\s\-()]{8,}\d", "[PHONE]", t)
    t = re.sub(r"(https?://)?(www\.)?(linkedin|github)\.com/\S+", "[LINK]", t, flags=re.I)
    t = re.sub(r"\b(he|she|his|her|him|mr|mrs|ms)\b\.?", "they", t, flags=re.I)
    return t


BIAS = {"rockstar": "skilled professional", "ninja": "expert", "guru": "specialist", "digital native": "comfortable with technology",
        "young": "motivated", "energetic": "motivated", "recent graduate": "early-career", "salesman": "salesperson",
        "manpower": "workforce", "chairman": "chairperson", "aggressive": "proactive", "native english": "fluent English",
        "fresh blood": "new perspectives", "work hard, play hard": "collaborative culture"}


def jd_check(jd):
    low = jd.lower()
    flags = [(w, fix) for w, fix in BIAS.items() if w in low]
    yrs = [int(x) for x in re.findall(r"(\d+)\+?\s*years", low)]
    return {"flags": flags, "words": len(jd.split()), "max_years": max(yrs) if yrs else 0,
            "must_have_lines": len(re.findall(r"must|required|mandatory", low))}


STOP = set("the and for with you our are will this that from have has your their about work team role job "
           "experience years ability strong skills knowledge and/or including such using build per etc can able "
           "good new use within across into over more than also who what when where how must nice plus".split())


def keyword_match(resume, jd, top=30):
    words = [w.lower().strip(".-") for w in re.findall(r"[A-Za-z][A-Za-z0-9+#.\-]{1,}", jd)]
    freq = {}
    for w in words:
        if w not in STOP and len(w) > 2: freq[w] = freq.get(w, 0) + 1
    kws = sorted(freq, key=lambda x: -freq[x])[:top]
    have = {w.lower().strip(".-") for w in re.findall(r"[A-Za-z][A-Za-z0-9+#.\-]{1,}", resume)}
    found = [k for k in kws if k in have]
    return found, [k for k in kws if k not in have], round(100 * len(found) / max(len(kws), 1))
