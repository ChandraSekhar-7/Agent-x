"""TalentLens AI - Resume Screening & Interview Agent (LangChain + Gemini).
2 LLM calls per candidate:  (1) analysis  ->  (2) tailored questions.
Everything else (weighted score, ATS checks, ranking) is computed locally.
"""
import os, re
from typing import List, Literal
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
FALLBACK_MODELS = []  # intentionally empty: models are discovered from YOUR api key


def list_models():
    """Return (models, error). Prioritizes GEMINI_MODEL env var and stable models, discovered via API key."""
    try:
        preferred = []
        env_m = os.getenv("GEMINI_MODEL")
        if env_m:
            preferred.append(env_m.strip())
        
        defaults = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
        for d in defaults:
            if d not in preferred:
                preferred.append(d)

        from google import genai
        c = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        bad = ("image", "tts", "live", "audio", "embed", "robotics", "computer", "vision", "aqa", "learnlm", "transcribe", "banana")
        raw = [m.name.replace("models/", "") for m in c.models.list()
               if "generateContent" in (m.supported_actions or [])]
        discovered = [n for n in raw if n.startswith("gemini") and not any(x in n for x in bad)]
        
        final_models = [m for m in preferred if m in discovered or m in defaults]
        for n in discovered:
            if n not in final_models and "latest" not in n:
                final_models.append(n)
        for n in discovered:
            if n not in final_models:
                final_models.append(n)

        return final_models, ("" if final_models else "The API returned no usable Gemini models for this key.")
    except Exception as e:
        fallback = [os.getenv("GEMINI_MODEL") or "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"]
        return fallback, str(e)


# ---------- Schemas ----------
class Scores(BaseModel):
    skills: int = Field(ge=0, le=100)
    experience: int = Field(ge=0, le=100)
    education: int = Field(ge=0, le=100)
    projects: int = Field(ge=0, le=100)
    communication: int = Field(ge=0, le=100, description="Clarity/quality of the resume itself")


class Skill(BaseModel):
    skill: str
    evidence: str
    level: Literal["Beginner", "Intermediate", "Advanced"]


class Gap(BaseModel):
    skill: str
    importance: Literal["Must-have", "Nice-to-have"]
    learning_tip: str = Field(description="One concrete way to close this gap")


class Analysis(BaseModel):
    candidate_name: str
    current_role: str
    total_experience_years: float
    education_summary: str
    job_title: str
    scores: Scores
    matched_skills: List[Skill]
    partial_skills: List[str]
    gaps: List[Gap]
    strengths: List[str]
    red_flags: List[str] = Field(description="Employment gaps, vague claims, job hopping, inconsistencies")
    resume_tips: List[str]
    summary: str
    recommendation: Literal["Strong Hire", "Interview", "Maybe", "Reject"]


class Question(BaseModel):
    question: str
    category: Literal["Technical", "Gap-probing", "Behavioral", "Scenario", "HR"]
    targets: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    good_answer_signals: str
    follow_up: str


class QuestionSet(BaseModel):
    questions: List[Question]


class Email(BaseModel):
    subject: str
    body: str


# ---------- LLM helper with model fallback ----------
def _run(system, human, schema, inputs, models):
    last = None
    if not models:
        models, err = list_models()
        if not models:
            raise RuntimeError("No Gemini models available for your API key. " + err)
    for m in models:
        try:
            llm = ChatGoogleGenerativeAI(model=m, temperature=0.2, max_retries=1,
                                         google_api_key=os.getenv("GOOGLE_API_KEY"))
            prompt = ChatPromptTemplate.from_messages([("system", system), ("human", human)])
            return (prompt | llm.with_structured_output(schema)).invoke(inputs)
        except Exception as e:  # quota / model error -> try next model
            last = e
            continue
    raise last


def analyze(resume, jd, models=FALLBACK_MODELS) -> dict:
    return _run(
        "You are a strict but fair technical recruiter. Extract the candidate profile and compare it to the job. "
        "Only count a skill as matched when the resume gives evidence; treat close synonyms as matches. "
        "Score each dimension 0-100 against the job requirements. Be specific and concise.",
        "JOB DESCRIPTION:\n{jd}\n\nRESUME:\n{resume}", Analysis,
        {"jd": jd, "resume": resume}, models).model_dump()


def gen_questions(analysis: dict, jd, n=8, focus="Balanced", difficulty="Mixed",
                  models=FALLBACK_MODELS) -> list:
    import json
    out = _run(
        "You are a senior interviewer. Create exactly {n} tailored interview questions. Interview focus: {focus}. "
        "Difficulty: {difficulty}. Verify claimed strengths, probe EVERY gap and partial skill, and tie scenario "
        "questions to the job. Never ask generic questions.",
        "JOB DESCRIPTION:\n{jd}\n\nCANDIDATE ANALYSIS:\n{a}", QuestionSet,
        {"n": n, "focus": focus, "difficulty": difficulty, "jd": jd,
         "a": json.dumps(analysis)}, models)
    return [q.model_dump() for q in out.questions]


def draft_email(kind, analysis: dict, models=FALLBACK_MODELS) -> dict:
    return _run(
        "You write professional, warm recruiter emails. Keep under 150 words. Sign as 'Talent Acquisition Team'.",
        "Write a '{kind}' email to {name} for the role '{role}'. Strengths to mention: {s}. "
        "Gaps (mention gently only if rejecting or asking for info): {g}.",
        Email, {"kind": kind, "name": analysis["candidate_name"], "role": analysis["job_title"],
                "s": ", ".join(analysis["strengths"][:3]),
                "g": ", ".join(g["skill"] for g in analysis["gaps"][:3])}, models).model_dump()


def screen(resume, jd, n=8, focus="Balanced", difficulty="Mixed", models=FALLBACK_MODELS) -> dict:
    a = analyze(resume, jd, models)
    return {"analysis": a, "questions": gen_questions(a, jd, n, focus, difficulty, models),
            "ats": ats_checks(resume)}


# ---------- Local (no-LLM) features ----------
def overall_score(scores: dict, w: dict) -> int:
    tot = sum(w.values()) or 1
    return round(sum(scores[k] * w[k] for k in w) / tot)


def skill_coverage(a: dict) -> int:
    m, p, g = len(a["matched_skills"]), len(a["partial_skills"]), len(a["gaps"])
    return round(100 * (m + 0.5 * p) / max(m + p + g, 1))


def ats_checks(text: str):
    t, words = text.lower(), len(text.split())
    return [
        ("Email address present", bool(re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text))),
        ("Phone number present", bool(re.search(r"\+?\d[\d\s\-()]{8,}\d", text))),
        ("LinkedIn / GitHub link", "linkedin" in t or "github" in t),
        ("Experience section", "experience" in t),
        ("Education section", "education" in t),
        ("Skills section", "skills" in t),
        ("Projects section", "project" in t),
        ("Quantified achievements (%, numbers)", bool(re.search(r"\d+\s?%|\d+\+|\$\d", text))),
        (f"Length is reasonable ({words} words)", 150 <= words <= 1200),
    ]


def report_markdown(d: dict, overall: int) -> str:
    a = d["analysis"]
    L = [f"# Screening Report - {a['candidate_name']}", f"**Role:** {a['job_title']}  ",
         f"**Overall score:** {overall}/100  |  **Recommendation:** {a['recommendation']}", "",
         "## Summary", a["summary"], "", "## Dimension scores"]
    L += [f"- {k.title()}: {v}" for k, v in a["scores"].items()]
    L += ["", "## Matched skills"] + [f"- {s['skill']} ({s['level']}): {s['evidence']}" for s in a["matched_skills"]]
    L += ["", "## Skill gaps"] + [f"- {g['skill']} [{g['importance']}] - {g['learning_tip']}" for g in a["gaps"]]
    L += ["", "## Red flags"] + [f"- {x}" for x in a["red_flags"] or ["None"]]
    L += ["", "## Interview questions"]
    for i, q in enumerate(d["questions"], 1):
        L += [f"{i}. **[{q['category']} / {q['difficulty']}]** {q['question']}",
              f"   - Tests: {q['targets']}", f"   - Good answer: {q['good_answer_signals']}",
              f"   - Follow-up: {q['follow_up']}"]
    return "\n".join(L)


def scorecard_markdown(d: dict) -> str:
    a = d["analysis"]
    L = [f"# Interview Scorecard - {a['candidate_name']} ({a['job_title']})", "",
         "Rate 1-5. Interviewer: ________  Date: ________", "",
         "| # | Question | Category | Rating (1-5) | Notes |", "|---|---|---|---|---|"]
    L += [f"| {i} | {q['question']} | {q['category']} |  |  |" for i, q in enumerate(d["questions"], 1)]
    L += ["", "**Final decision:** [ ] Hire  [ ] Hold  [ ] Reject", "**Comments:**"]
    return "\n".join(L)


if __name__ == "__main__":
    import sys, json
    r, j = open(sys.argv[1], encoding="utf-8").read(), open(sys.argv[2], encoding="utf-8").read()
    print(json.dumps(screen(r, j), indent=2))