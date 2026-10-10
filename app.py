import json, hashlib, glob, os
from urllib.parse import quote_plus
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from pypdf import PdfReader
import agent as ag
import extras as ex

st.set_page_config(page_title="TalentLens AI", page_icon="🎯", layout="centered", initial_sidebar_state="collapsed")
st.markdown("""<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
html,body,[class*="css"]{font-family:'Inter',sans-serif}
#MainMenu,footer{visibility:hidden}
header[data-testid="stHeader"]{background:transparent}
.block-container{max-width:1000px;padding-top:1.2rem}
/* ---------- motion ---------- */
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes grow{from{width:0}}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.element-container,[data-testid="stElementContainer"]{animation:fadeUp .55s cubic-bezier(.2,.7,.2,1) both}
/* ---------- hero ---------- */
.hero{background:linear-gradient(135deg,#312e81 0%,#4f46e5 55%,#7c3aed 100%);color:#fff;border-radius:18px;
 padding:22px 28px;margin-bottom:14px;box-shadow:0 12px 30px rgba(79,70,229,.25)}
.hero h1{margin:0;font-size:1.7rem;font-weight:700;letter-spacing:-.02em;color:#fff}
.hero p{margin:4px 0 0;color:#e0e7ff;font-size:.95rem}
.chip{display:inline-block;background:rgba(255,255,255,.16);border-radius:999px;padding:3px 12px;margin:10px 6px 0 0;font-size:.78rem;font-weight:600}
/* ---------- nav pills ---------- */
.st-key-page div[role="radiogroup"]{gap:6px;flex-wrap:wrap}
.st-key-page label{background:#fff;border:1px solid #e2e8f0;border-radius:999px;padding:6px 16px;cursor:pointer;transition:all .2s}
.st-key-page label>div:first-child{display:none}
.st-key-page label:hover{border-color:#a5b4fc;transform:translateY(-1px)}
.st-key-page label:has(input:checked){background:linear-gradient(135deg,#4f46e5,#7c3aed);border-color:transparent;box-shadow:0 6px 16px rgba(79,70,229,.3)}
.st-key-page label:has(input:checked) p{color:#fff!important;font-weight:600}
/* ---------- cards & bits ---------- */
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px 18px;margin-bottom:10px;
 box-shadow:0 1px 2px rgba(15,23,42,.04);transition:transform .2s,box-shadow .2s,border-color .2s}
.card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(79,70,229,.12);border-color:#c7d2fe}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.74rem;font-weight:600;margin:2px 4px 2px 0;color:#fff}
.g{background:#059669}.y{background:#d97706}.r{background:#dc2626}.b{background:#4f46e5}.n{background:#64748b}.t{background:#0891b2}
.muted{color:#64748b;font-size:.85rem}
.ring{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;position:relative;font-weight:700;
 background:conic-gradient(var(--c) calc(var(--p)*1%),#e2e8f0 0);animation:pop .7s cubic-bezier(.2,.8,.2,1) both}
.ring::before{content:"";position:absolute;inset:6px;border-radius:50%;background:#fff}
.ring b{position:relative}
.bar{height:8px;border-radius:99px;background:#e2e8f0;margin-top:6px;overflow:hidden}
.bar i{display:block;height:8px;border-radius:99px;background:linear-gradient(90deg,#4f46e5,#7c3aed);animation:grow 1s ease}
.stButton>button,.stDownloadButton>button,.stLinkButton>a{border-radius:10px;font-weight:600;transition:all .2s}
.stButton>button:hover,.stDownloadButton>button:hover,.stLinkButton>a:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(79,70,229,.2)}
.stButton>button[kind="primary"]{background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none}
.cmp{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,.05)}
.cmp td,.cmp th{padding:9px 12px;border-bottom:1px solid #eef2f7;text-align:center}
.cmp td:first-child{text-align:left;color:#64748b}.cmp th{background:#f1f5f9}
.win{background:#dcfce7;font-weight:700;color:#166534}
h5{margin-bottom:.2rem}
</style>""", unsafe_allow_html=True)

REC = {"Strong Hire": "g", "Interview": "b", "Maybe": "y", "Reject": "r"}
LVL = {"Beginner": "y", "Intermediate": "b", "Advanced": "g"}
PAL = ["#4f46e5", "#0891b2", "#7c3aed", "#059669", "#d97706"]
badge = lambda t, c="n": f'<span class="badge {c}">{t}</span>'
col_of = lambda s: "#059669" if s >= 70 else "#d97706" if s >= 45 else "#dc2626"
ring = lambda s: f'<div class="ring" style="--p:{s};--c:{col_of(s)}"><b>{s}</b></div>'
S = st.session_state
for k_, v_ in (("results", {}), ("cache", {}), ("samples", {}), ("sel", None), ("page", "Screen")): S.setdefault(k_, v_)


def bullets(items):
    for x in items: st.markdown(f"- {x}")


def warns(items):
    for x in items: st.warning(x)


def read_file(f):
    if f.name.lower().endswith(".pdf"):
        return "\n".join(p.extract_text() or "" for p in PdfReader(f).pages)
    return f.read().decode("utf-8", errors="ignore")


def load_samples():
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")
    S["jd_text"] = open(os.path.join(d, "jd.txt"), encoding="utf-8").read()
    S["samples"] = {os.path.basename(p): open(p, encoding="utf-8").read() for p in sorted(glob.glob(os.path.join(d, "resume_*.txt")))}


def style(fig, h=300):
    fig.update_layout(height=h, margin=dict(t=20, b=20, l=30, r=30), paper_bgcolor="rgba(0,0,0,0)",
                      plot_bgcolor="rgba(0,0,0,0)", font=dict(family="Inter", color="#334155"))
    return fig


def radar(items):
    fig = go.Figure()
    for i, (name, sc) in enumerate(items):
        v = list(sc.values()); th = [k.title() for k in sc]
        fig.add_trace(go.Scatterpolar(r=v + v[:1], theta=th + th[:1], fill="toself", name=name, opacity=.6,
                                      line=dict(color=PAL[i % 5]), fillcolor=PAL[i % 5]))
    fig.update_layout(polar=dict(radialaxis=dict(range=[0, 100], showticklabels=False)), showlegend=len(items) > 1)
    return style(fig, 320)


# ---------------- Sidebar settings (always available) ----------------
with st.sidebar:
    st.markdown("### ⚙️ Settings")
    avail, merr = st.cache_data(ttl=300)(ag.list_models)()
    if not avail:
        st.error("Could not get models from your API key. " + (merr[:250] or "Check GOOGLE_API_KEY in .env")); st.stop()
    primary = st.selectbox("Gemini model", avail, help="Loaded from your API key.")
    MODELS = [primary] + [m for m in avail if m != primary][:2]
    n_q = st.slider("Interview questions", 4, 15, 8)
    focus = st.selectbox("Interview focus", ["Balanced", "Technical", "Behavioral", "HR / Culture", "Managerial"])
    diff = st.selectbox("Difficulty", ["Mixed", "Easy", "Medium", "Hard"])
    thr = st.slider("Auto-shortlist score", 0, 100, 70)
    blind = st.checkbox("🕶️ Blind screening", help="Hides name and contact details from the AI to reduce bias.")
    st.markdown("**Scoring weights**")
    W = {"skills": st.slider("Skills", 0, 100, 40), "experience": st.slider("Experience", 0, 100, 25),
         "education": st.slider("Education", 0, 100, 10), "projects": st.slider("Projects", 0, 100, 15),
         "communication": st.slider("Resume quality", 0, 100, 10)}
    st.caption("Changing weights re-scores instantly with no extra API calls.")
    if st.button("🧪 Test model", use_container_width=True):
        try:
            ag.ChatGoogleGenerativeAI(model=primary, max_retries=0, google_api_key=os.getenv("GOOGLE_API_KEY")).invoke("Reply OK")
            st.success(f"{primary} works ✅")
        except Exception as e: st.error(str(e)[:200])
    if st.button("🔄 Refresh model list", use_container_width=True): st.cache_data.clear(); st.rerun()


def rows():
    out = []
    for k, r in S["results"].items():
        a = r["analysis"]; ov = ag.overall_score(a["scores"], W)
        dec = S.get(f"dec_{k}", "Pending")
        if dec == "Pending" and ov >= thr: dec = "Shortlist"
        out.append({"File": k, "Candidate": a["candidate_name"], "Role": a["current_role"], "Score": ov, "Recommendation": a["recommendation"],
                    "Exp (yrs)": a["total_experience_years"], "Skill coverage %": ag.skill_coverage(a), "Gaps": len(a["gaps"]), "Status": dec})
    return sorted(out, key=lambda x: -x["Score"])


R = rows()
chips = (f'<span class="chip">👥 {len(R)} candidates</span><span class="chip">🏆 Top score {R[0]["Score"]}</span>'
         f'<span class="chip">⭐ {sum(x["Status"] == "Shortlist" for x in R)} shortlisted</span>') if R else ""
st.markdown(f'<div class="hero"><h1>🎯 TalentLens AI</h1><p>Screen resumes, spot skill gaps and get tailored interview questions in seconds.</p>{chips}</div>',
            unsafe_allow_html=True)

PAGES = {"Screen": "📥", "Candidates": "👥", "Compare": "⚖️", "Insights": "📊", "Find jobs": "💼"}
if S.get("goto"): S["page"] = S.pop("goto")
page = st.radio("Navigation", list(PAGES), horizontal=True, key="page", label_visibility="collapsed", format_func=lambda p: f"{PAGES[p]}  {p}")


def need_results():
    if S["results"]: return False
    st.markdown('<div class="card muted" style="text-align:center;padding:30px">Nothing to show yet. Go to <b>Screen</b>, add resumes and a job description, then press <b>Analyze</b>.</div>', unsafe_allow_html=True)
    return True


# =============== SCREEN ===============
if page == "Screen":
    c1, c2 = st.columns(2, gap="large")
    with c1:
        st.markdown("##### ① Add resumes")
        ups = st.file_uploader("Resumes", type=["pdf", "txt"], accept_multiple_files=True, label_visibility="collapsed")
        st.button("✨ Try with demo data", on_click=load_samples)
    with c2:
        st.markdown("##### ② Paste the job description")
        jd = st.text_area("Job description", key="jd_text", height=150, label_visibility="collapsed", placeholder="Paste the job description here...")
        if jd.strip():
            with st.expander("🔎 Check this job description"):
                c = ex.jd_check(jd)
                if c["flags"]: st.warning("Biased wording: " + ", ".join(f"'{w}' → {f}" for w, f in c["flags"]))
                else: st.success("No biased wording found.")
                st.caption(f"{c['words']} words · asks up to {c['max_years']} years of experience")
    docs = {f.name: read_file(f) for f in ups}; docs.update(S["samples"])
    st.markdown("##### ③ Analyze")
    if st.button(f"🚀 Analyze {len(docs)} candidate(s)" if docs else "🚀 Analyze candidates", type="primary", use_container_width=True, disabled=not (docs and jd.strip())):
        bar = st.progress(0.0, text="Analyzing..."); ok = 0
        for i, (name, text) in enumerate(docs.items()):
            text = ex.mask_pii(text) if blind else text
            key = hashlib.md5((text + jd + str(n_q) + focus + diff).encode()).hexdigest()
            try:
                if key not in S["cache"]: S["cache"][key] = ag.screen(text, jd, n_q, focus, diff, MODELS)
                r = dict(S["cache"][key]); r["file"] = name; r["resume"] = text; S["results"][name] = r; ok += 1
            except Exception as e:
                st.error(f"❌ {name} failed")
                with st.expander(f"Error details: {name}"): st.code(str(e))
            bar.progress((i + 1) / len(docs), text=f"Analyzed {i + 1} of {len(docs)}")
        S["sel"] = None
        if ok == len(docs): S["goto"] = "Candidates"; st.rerun()
    if S["results"]: st.caption(f"✅ {len(S['results'])} candidate(s) analyzed. Open the Candidates tab to see them.")

# =============== CANDIDATES ===============
elif page == "Candidates" and not need_results():
    if S["sel"] not in S["results"]: S["sel"] = R[0]["File"]
    h1, h2 = st.columns([3, 1], vertical_alignment="center")
    h1.markdown("##### 🏆 Ranked candidates"); h2.download_button("⬇️ Export CSV", pd.DataFrame(R).to_csv(index=False), "ranking.csv", use_container_width=True)
    for n, row in enumerate(R, 1):
        a_, b_, c_, d_ = st.columns([0.9, 4, 2.2, 1.3], vertical_alignment="center")
        a_.markdown(ring(row["Score"]), unsafe_allow_html=True)
        b_.markdown(f"**{n}. {row['Candidate']}**  \n<span class='muted'>{row['Role']} · {row['Exp (yrs)']} yrs · {row['Gaps']} gaps</span>", unsafe_allow_html=True)
        c_.markdown(badge(row["Recommendation"], REC[row["Recommendation"]]) + badge(row["Status"], "t" if row["Status"] == "Shortlist" else "n"), unsafe_allow_html=True)
        if d_.button("Viewing ✓" if S["sel"] == row["File"] else "Open", key=f"v_{row['File']}", use_container_width=True,
                     type="primary" if S["sel"] == row["File"] else "secondary"):
            S["sel"] = row["File"]; st.rerun()

    k = S["sel"]; r = S["results"][k]; a = r["analysis"]; ov = next(z["Score"] for z in R if z["File"] == k)
    st.divider()
    d1, d2 = st.columns([5, 1], vertical_alignment="center")
    d1.markdown(f"### {a['candidate_name']}  \n{badge(a['recommendation'], REC[a['recommendation']])}{badge(a['current_role'], 'b')}{badge(a['education_summary'][:40])}", unsafe_allow_html=True)
    d2.markdown(ring(ov), unsafe_allow_html=True)
    tO, tS, tQ, tM = st.tabs(["Overview", "Skills", "Interview", "More"])
    with tO:
        o1, o2 = st.columns(2, gap="large")
        o1.plotly_chart(radar([(a["candidate_name"], a["scores"])]), use_container_width=True, key="rad_main")
        with o2:
            st.info(a["summary"])
            m1, m2, m3 = st.columns(3)
            m1.metric("Experience", f"{a['total_experience_years']}y"); m2.metric("Skill fit", f"{ag.skill_coverage(a)}%"); m3.metric("Gaps", len(a["gaps"]))
        st.markdown("**💪 Strengths**"); bullets(a["strengths"])
        if a["red_flags"]: st.markdown("**🚩 Things to check**"); warns(a["red_flags"])
    with tS:
        st.markdown("##### ✅ Matches")
        for m in a["matched_skills"]:
            st.markdown(f'<div class="card"><b>{m["skill"]}</b> {badge(m["level"], LVL[m["level"]])}<br><span class="muted">{m["evidence"]}</span></div>', unsafe_allow_html=True)
        if a["partial_skills"]:
            st.markdown("##### 🟡 Partial evidence"); st.markdown("".join(badge(z, "y") for z in a["partial_skills"]), unsafe_allow_html=True)
        st.markdown("##### ❌ Gaps & how to close them")
        for g in a["gaps"]:
            st.markdown(f'<div class="card"><b>{g["skill"]}</b> {badge(g["importance"], "r" if g["importance"] == "Must-have" else "n")}<br><span class="muted">💡 {g["learning_tip"]}</span></div>', unsafe_allow_html=True)
        if not a["gaps"]: st.success("No gaps found 🎉")
    with tQ:
        cats = st.multiselect("Categories", ["Technical", "Gap-probing", "Behavioral", "Scenario", "HR"], default=["Technical", "Gap-probing", "Behavioral", "Scenario", "HR"], label_visibility="collapsed")
        for n, q in enumerate([z for z in r["questions"] if z["category"] in cats], 1):
            with st.expander(f"{n}. {q['question']}"):
                st.markdown(f"{badge(q['category'], 'b')}{badge(q['difficulty'])}", unsafe_allow_html=True)
                st.markdown(f"**Tests:** {q['targets']}  \n**Good answer:** {q['good_answer_signals']}  \n**Follow-up:** {q['follow_up']}")
        st.download_button("⬇️ Printable scorecard", ag.scorecard_markdown(r), f"scorecard_{a['candidate_name']}.md")
        with st.expander("🎤 Practice an answer (mock interview)"):
            qq = st.selectbox("Question", [z["question"] for z in r["questions"]], key=f"mq_{k}")
            ans = st.text_area("Your answer", height=120, key=f"ans_{k}")
            if st.button("Evaluate answer", key=f"ev_{k}") and ans.strip():
                try: S[f"eval_{k}"] = ex.eval_answer(qq, ans, a["job_title"], MODELS)
                except Exception as e: st.error(str(e)[:250])
            ev = S.get(f"eval_{k}")
            if ev:
                st.metric("Score", f"{ev['score']}/10"); st.success("**Good:** " + "; ".join(ev["strengths"]))
                st.warning("**Improve:** " + "; ".join(ev["improvements"])); st.info("**Model answer:** " + ev["model_answer"])
    with tM:
        st.markdown("##### Decision")
        e1, e2 = st.columns(2)
        e1.selectbox("Status", ["Pending", "Shortlist", "On hold", "Rejected"], key=f"dec_{k}"); e2.text_input("Note", key=f"note_{k}", placeholder="Private note")
        st.markdown("##### Resume health"); ck = st.columns(2)
        for n, (lab, okk) in enumerate(r["ats"]): ck[n % 2].markdown(("✅ " if okk else "❌ ") + lab)
        found, miss, pct = ex.keyword_match(r["resume"], S.get("jd_text", ""))
        st.markdown(f"**Keyword match with the job description: {pct}%**")
        st.markdown("".join(badge(z, "g") for z in found) + "".join(badge(z, "r") for z in miss), unsafe_allow_html=True)
        with st.expander("✉️ Draft an email"):
            kind = st.selectbox("Type", ["Interview invitation", "Polite rejection", "Request more information"])
            if st.button("Generate"):
                try: S[f"mail_{k}"] = ag.draft_email(kind, a, MODELS)
                except Exception as e: st.error(str(e)[:250])
            if S.get(f"mail_{k}"): st.text_input("Subject", S[f"mail_{k}"]["subject"]); st.text_area("Body", S[f"mail_{k}"]["body"], height=190)
        x1, x2 = st.columns(2)
        x1.download_button("⬇️ Report (Markdown)", ag.report_markdown(r, ov), f"report_{a['candidate_name']}.md", use_container_width=True)
        x2.download_button("⬇️ Data (JSON)", json.dumps(r, indent=2), f"{a['candidate_name']}.json", use_container_width=True)

# =============== COMPARE ===============
elif page == "Compare" and not need_results():
    if len(R) < 2: st.info("Analyze at least two candidates to compare them.")
    else:
        files = [z["File"] for z in R]; nm = lambda z: S["results"][z]["analysis"]["candidate_name"]
        p1, p2 = st.columns(2)
        A = p1.selectbox("Candidate A", files, 0, format_func=nm); B = p2.selectbox("Candidate B", files, 1, format_func=nm)
        a, b = S["results"][A]["analysis"], S["results"][B]["analysis"]
        oa, ob = (next(z["Score"] for z in R if z["File"] == f) for f in (A, B))
        k1, k2 = st.columns(2)
        for col, an, o in ((k1, a, oa), (k2, b, ob)):
            col.markdown(f'<div class="card" style="display:flex;gap:16px;align-items:center">{ring(o)}<div><b>{an["candidate_name"]}</b><br>{badge(an["recommendation"], REC[an["recommendation"]])}</div></div>', unsafe_allow_html=True)
        st.plotly_chart(radar([(a["candidate_name"], a["scores"]), (b["candidate_name"], b["scores"])]), use_container_width=True, key="rad_cmp")
        items = [("Overall score", oa, ob, 1)] + [(k_.title(), a["scores"][k_], b["scores"][k_], 1) for k_ in a["scores"]] + [
            ("Experience (yrs)", a["total_experience_years"], b["total_experience_years"], 1), ("Skill coverage %", ag.skill_coverage(a), ag.skill_coverage(b), 1),
            ("Matched skills", len(a["matched_skills"]), len(b["matched_skills"]), 1), ("Skill gaps", len(a["gaps"]), len(b["gaps"]), -1),
            ("Red flags", len(a["red_flags"]), len(b["red_flags"]), -1)]
        html = f'<table class="cmp"><tr><th></th><th>{a["candidate_name"]}</th><th>{b["candidate_name"]}</th></tr>'
        for lab, x, y, d in items:
            w = 0 if x == y else (1 if (x > y) == (d > 0) else 2)
            html += f'<tr><td>{lab}</td><td{" class=win" if w == 1 else ""}>{x}</td><td{" class=win" if w == 2 else ""}>{y}</td></tr>'
        st.markdown(html + "</table>", unsafe_allow_html=True)
        sa, sb = {z["skill"] for z in a["matched_skills"]}, {z["skill"] for z in b["matched_skills"]}
        st.markdown("##### Skills at a glance")
        s1, s2, s3 = st.columns(3)
        s1.markdown(f"**Only {a['candidate_name']}**<br>" + ("".join(badge(z, "b") for z in sorted(sa - sb)) or "–"), unsafe_allow_html=True)
        s2.markdown("**Both**<br>" + ("".join(badge(z, "g") for z in sorted(sa & sb)) or "–"), unsafe_allow_html=True)
        s3.markdown(f"**Only {b['candidate_name']}**<br>" + ("".join(badge(z, "t") for z in sorted(sb - sa)) or "–"), unsafe_allow_html=True)
        lead = abs(oa - ob)
        st.success(f"**{a['candidate_name'] if oa >= ob else b['candidate_name']}** leads by {lead} point(s)." if lead else "Both candidates score the same.")

# =============== INSIGHTS ===============
elif page == "Insights" and not need_results():
    names = [z["Candidate"] for z in R]
    st.markdown("##### Where the score comes from")
    tot = sum(W.values()) or 1; fig = go.Figure()
    for i, dim in enumerate(W):
        fig.add_trace(go.Bar(name=dim.title(), y=names[::-1], orientation="h", marker_color=PAL[i],
                             x=[round(S["results"][z["File"]]["analysis"]["scores"][dim] * W[dim] / tot, 1) for z in R][::-1]))
    fig.update_layout(barmode="stack", legend=dict(orientation="h", y=-0.2)); st.plotly_chart(style(fig, 300), use_container_width=True, key="stack")
    i1, i2 = st.columns(2)
    with i1:
        st.markdown("##### Most common skill gaps")
        cnt = {}
        for z in S["results"].values():
            for g in z["analysis"]["gaps"]: cnt[g["skill"]] = cnt.get(g["skill"], 0) + 1
        top = sorted(cnt.items(), key=lambda t: -t[1])[:8]
        if top: st.plotly_chart(style(go.Figure(go.Bar(x=[v for _, v in top][::-1], y=[n for n, _ in top][::-1], orientation="h", marker_color="#dc2626")), 280), use_container_width=True, key="gaps")
        else: st.success("No gaps across the pool.")
    with i2:
        st.markdown("##### Hiring pipeline")
        st_cnt = {s_: sum(x["Status"] == s_ for x in R) for s_ in ["Pending", "Shortlist", "On hold", "Rejected"]}
        st.plotly_chart(style(go.Figure(go.Pie(labels=list(st_cnt), values=list(st_cnt.values()), hole=.6, marker=dict(colors=["#94a3b8", "#4f46e5", "#d97706", "#dc2626"]))), 280), use_container_width=True, key="pipe")
    st.markdown("##### Most common strengths in the pool")
    sk = {}
    for z in S["results"].values():
        for m in z["analysis"]["matched_skills"]: sk[m["skill"]] = sk.get(m["skill"], 0) + 1
    st.markdown("".join(badge(f"{n} ×{c}", "g") for n, c in sorted(sk.items(), key=lambda t: -t[1])[:14]) or "–", unsafe_allow_html=True)
    st.caption("If one skill is missing in most candidates, consider relaxing it or widening your sourcing.")

# =============== FIND JOBS ===============
elif page == "Find jobs":
    st.markdown("##### Upload a resume and get matching roles")
    src = st.radio("Source", ["Upload resume", "Use a screened candidate"], horizontal=True, label_visibility="collapsed")
    rtext = ""
    if src == "Upload resume":
        jf = st.file_uploader("Resume", type=["pdf", "txt"], key="jf", label_visibility="collapsed"); rtext = read_file(jf) if jf else ""
    elif S["results"]:
        pk = st.selectbox("Candidate", list(S["results"]), format_func=lambda z: S["results"][z]["analysis"]["candidate_name"]); rtext = S["results"][pk]["resume"]
    else: st.info("Screen candidates first, or upload a resume.")
    prefs = st.text_input("Preferences (optional)", placeholder="e.g. remote, Hyderabad, product company, fresher")
    if st.button("🔍 Find best-fit jobs", type="primary", use_container_width=True, disabled=not rtext.strip()):
        with st.spinner("Matching your profile to roles..."):
            try: S["recs"] = ex.recommend_jobs(rtext, prefs, MODELS); S["rtext"] = rtext
            except Exception as e:
                st.error("Something went wrong")
                with st.expander("Details"): st.code(str(e))
    rc = S.get("recs")
    if rc:
        st.info(rc["profile_summary"]); st.markdown("**🧭 Career path:** " + "  →  ".join(rc["career_path"]))
        roles = rc["recommended"] + rc["stretch"]
        for grp, items in (("Ready for now", rc["recommended"]), ("Stretch goals", rc["stretch"])):
            st.markdown(f"##### {grp}")
            for x in items:
                st.markdown(f'<div class="card"><b>{x["title"]}</b> {badge(x["level"], "b")}<span style="float:right;font-weight:700">{x["fit_percent"]}% fit</span>'
                            f'<div class="bar"><i style="width:{x["fit_percent"]}%"></i></div><p class="muted" style="margin:8px 0 4px">{x["why_fit"]}</p>'
                            + "".join(badge("+ " + z, "y") for z in x["skills_to_add"]) + "</div>", unsafe_allow_html=True)
                kw = quote_plus(x["search_keywords"]); l1, l2, l3 = st.columns(3)
                l1.link_button("LinkedIn", f"https://www.linkedin.com/jobs/search/?keywords={kw}", use_container_width=True)
                l2.link_button("Indeed", f"https://www.indeed.com/jobs?q={kw}", use_container_width=True)
                l3.link_button("Naukri", "https://www.naukri.com/" + x["search_keywords"].strip().lower().replace(" ", "-") + "-jobs", use_container_width=True)
        st.divider(); st.markdown("##### Next steps for one role")
        tgt = st.selectbox("Target role", [x["title"] for x in roles], label_visibility="collapsed"); q1, q2 = st.columns(2)
        if q1.button("🗺️ 12-week roadmap", use_container_width=True):
            try: S["road"] = ex.build_roadmap(S["rtext"], tgt, MODELS)
            except Exception as e: st.error(str(e)[:250])
        if q2.button("✍️ Improve my resume", use_container_width=True):
            try: S["boost"] = ex.boost_resume(S["rtext"], tgt, MODELS)
            except Exception as e: st.error(str(e)[:250])
        if S.get("road"):
            st.markdown(f"##### 🗺️ Roadmap: {S['road']['target_role']}")
            for p in S["road"]["phases"]:
                with st.expander(f"{p['period']} · {p['focus']}", expanded=True):
                    bullets(p["tasks"]); st.markdown(f"**Mini-project:** {p['mini_project']}")
        if S.get("boost"):
            bo = S["boost"]; st.markdown("##### ✍️ Improved resume content")
            st.text_area("Summary", bo["tailored_summary"], height=90); st.text_input("LinkedIn headline", bo["linkedin_headline"])
            st.dataframe(pd.DataFrame(bo["rewritten_bullets"]).rename(columns={"original": "Before", "improved": "After"}), hide_index=True, use_container_width=True)
            st.text_area("Cover letter", bo["cover_letter"], height=220)