const { spawn } = require('child_process');
const path = require('path');

const runPython = async (funcName, args = {}) => {
  return new Promise((resolve, reject) => {
    // Determine path to python executable in virtualenv
    // Root directory is two levels up from this file
    const rootDir = path.resolve(__dirname, '..', '..');
    const pythonExe = process.platform === 'win32' 
      ? path.join(rootDir, 'venv', 'Scripts', 'python.exe')
      : path.join(rootDir, 'venv', 'bin', 'python');
      
    // Try venv python first, fallback to system python if venv not found
    const fs = require('fs');
    const pythonPath = fs.existsSync(pythonExe) ? pythonExe : 'python';

    const scriptPath = path.join(__dirname, 'run_python.py');
    
    // We pass the python executable's cwd to rootDir so that dotenv can pick up the root .env
    const py = spawn(pythonPath, [scriptPath], {
      cwd: rootDir
    });

    let stdoutData = '';
    let stderrData = '';

    py.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}\nStderr: ${stderrData}`));
      }
      try {
        const outString = stdoutData.trim().split('\n').pop();
        const parsed = JSON.parse(outString);
        if (parsed.error) {
          if (parsed.traceback) {
            console.error("Python Error Traceback:\n", parsed.traceback);
          }
          return reject(new Error(parsed.error));
        }
        resolve(parsed.result);
      } catch (e) {
        reject(new Error(`Failed to parse python output: ${e.message}\nOutput: ${stdoutData}\nStderr: ${stderrData}`));
      }
    });

    py.stdin.write(JSON.stringify({ func: funcName, args }));
    py.stdin.end();
  });
};

async function listModels() {
  const res = await runPython('listModels');
  if (res.error) throw new Error(res.error);
  return res.models;
}

async function analyze(resume, jd) {
  return runPython('analyze', { resume, jd });
}

async function genQuestions(analysis, jd, n = 8, focus = "Balanced", difficulty = "Mixed") {
  return runPython('genQuestions', { analysis, jd, n, focus, difficulty });
}

async function draftEmail(kind, analysis) {
  return runPython('draftEmail', { kind, analysis });
}

async function screen(resume, jd, n = 8, focus = "Balanced", difficulty = "Mixed") {
  return runPython('screen', { resume, jd, n, focus, difficulty });
}

async function recommendJobs(resume, prefs = "") {
  return runPython('recommendJobs', { resume, prefs });
}

async function boostResume(resume, role) {
  return runPython('boostResume', { resume, role });
}

async function buildRoadmap(resume, role) {
  return runPython('buildRoadmap', { resume, role });
}

async function evalAnswer(question, answer, role) {
  return runPython('evalAnswer', { question, answer, role });
}

async function autoApply(resume, job_description, company = 'Target Enterprise') {
  return runPython('autoApply', { resume, job_description, company });
}

async function searchLiveJobs(query, location = 'Remote') {
  return runPython('searchLiveJobs', { query, location });
}

async function overallScore(scores, weights) {
  try {
    return await runPython('overallScore', { scores, weights });
  } catch (e) {
    const tot = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    let s = 0;
    for (const k in weights) {
      if (scores[k] != null) s += scores[k] * weights[k];
    }
    return Math.round(s / tot);
  }
}

async function skillCoverage(a) {
  try {
    return await runPython('skillCoverage', { a });
  } catch (e) {
    const m = (a.matched_skills || []).length;
    const p = (a.partial_skills || []).length;
    const g = (a.gaps || []).length;
    return Math.round(100 * (m + 0.5 * p) / Math.max(m + p + g, 1));
  }
}

async function atsChecks(text) {
  try {
    return await runPython('atsChecks', { text });
  } catch (e) {
    const t = text.toLowerCase();
    const words = text.split(/\s+/).length;
    return [
      { label: "Email address present", passed: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) },
      { label: "Phone number present", passed: /\+?\d[\d\s\-()]{8,}\d/.test(text) },
      { label: "LinkedIn / GitHub link", passed: t.includes("linkedin") || t.includes("github") },
      { label: "Experience section", passed: t.includes("experience") },
      { label: "Education section", passed: t.includes("education") },
      { label: "Skills section", passed: t.includes("skills") },
      { label: "Projects section", passed: t.includes("project") },
      { label: "Quantified achievements (%, numbers)", passed: /\d+\s?%|\d+\+|\$\d/.test(text) },
      { label: `Length is reasonable (${words} words)`, passed: words >= 150 && words <= 1200 }
    ];
  }
}

const BIAS = {
  "rockstar": "skilled professional", "ninja": "expert", "guru": "specialist",
  "digital native": "comfortable with technology", "young": "motivated",
  "energetic": "motivated", "recent graduate": "early-career", "salesman": "salesperson",
  "manpower": "workforce", "chairman": "chairperson", "aggressive": "proactive",
  "native english": "fluent English", "fresh blood": "new perspectives",
  "work hard, play hard": "collaborative culture"
};

async function jdCheck(jd) {
  try {
    return await runPython('jdCheck', { jd });
  } catch (e) {
    const low = jd.toLowerCase();
    const flags = Object.entries(BIAS).filter(([w]) => low.includes(w)).map(([w, fix]) => ({ word: w, suggestion: fix }));
    const yrs = [...low.matchAll(/(\d+)\+?\s*years/g)].map(m => parseInt(m[1]));
    return {
      flags, words: jd.split(/\s+/).length,
      max_years: yrs.length ? Math.max(...yrs) : 0,
      must_have_lines: (low.match(/must|required|mandatory/g) || []).length
    };
  }
}

const STOP = new Set("the and for with you our are will this that from have has your their about work team role job experience years ability strong skills knowledge and/or including such using build per etc can able good new use within across into over more than also who what when where how must nice plus".split(" "));

async function keywordMatch(resume, jd, top = 30) {
  try {
    return await runPython('keywordMatch', { resume, jd, top });
  } catch (e) {
    const words = (jd.match(/[A-Za-z][A-Za-z0-9+#.\-]{1,}/g) || []).map(w => w.toLowerCase().replace(/^[.-]+|[.-]+$/g, ''));
    const freq = {};
    for (const w of words) { if (!STOP.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1; }
    const kws = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, top);
    const have = new Set((resume.match(/[A-Za-z][A-Za-z0-9+#.\-]{1,}/g) || []).map(w => w.toLowerCase().replace(/^[.-]+|[.-]+$/g, '')));
    const found = kws.filter(k => have.has(k));
    const missing = kws.filter(k => !have.has(k));
    return { found, missing, pct: kws.length ? Math.round(100 * found.length / kws.length) : 0 };
  }
}

async function maskPii(text) {
  try {
    return await runPython('maskPii', { text });
  } catch (e) {
    let lines = text.trim().split('\n');
    if (lines.length && lines[0].split(/\s+/).length <= 5) lines[0] = '[CANDIDATE]';
    let t = lines.join('\n');
    t = t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL]');
    t = t.replace(/\+?\d[\d\s\-()]{8,}\d/g, '[PHONE]');
    t = t.replace(/(https?:\/\/)?(www\.)?(linkedin|github)\.com\/\S+/gi, '[LINK]');
    t = t.replace(/\b(he|she|his|her|him|mr|mrs|ms)\b\.?/gi, 'they');
    return t;
  }
}

async function reportMarkdown(data, overall) {
  try {
    return await runPython('reportMarkdown', { data, overall });
  } catch (e) {
    const a = data.analysis;
    const L = [
      `# Screening Report - ${a.candidate_name}`, `**Role:** ${a.job_title}  `,
      `**Overall score:** ${overall}/100  |  **Recommendation:** ${a.recommendation}`, '',
      '## Summary', a.summary, '', '## Dimension scores'
    ];
    for (const [k, v] of Object.entries(a.scores)) L.push(`- ${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`);
    L.push('', '## Matched skills');
    for (const s of a.matched_skills) L.push(`- ${s.skill} (${s.level}): ${s.evidence}`);
    L.push('', '## Skill gaps');
    for (const g of a.gaps) L.push(`- ${g.skill} [${g.importance}] - ${g.learning_tip}`);
    L.push('', '## Red flags');
    for (const x of (a.red_flags && a.red_flags.length ? a.red_flags : ['None'])) L.push(`- ${x}`);
    L.push('', '## Interview questions');
    data.questions.forEach((q, i) => {
      L.push(`${i + 1}. **[${q.category} / ${q.difficulty}]** ${q.question}`);
      L.push(`   - Tests: ${q.targets}`, `   - Good answer: ${q.good_answer_signals}`, `   - Follow-up: ${q.follow_up}`);
    });
    return L.join('\n');
  }
}

async function scorecardMarkdown(data) {
  try {
    return await runPython('scorecardMarkdown', { data });
  } catch (e) {
    const a = data.analysis;
    const L = [
      `# Interview Scorecard - ${a.candidate_name} (${a.job_title})`, '',
      'Rate 1-5. Interviewer: ________  Date: ________', '',
      '| # | Question | Category | Rating (1-5) | Notes |', '|---|---|---|---|---|'
    ];
    data.questions.forEach((q, i) => L.push(`| ${i + 1} | ${q.question} | ${q.category} |  |  |`));
    L.push('', '**Final decision:** [ ] Hire  [ ] Hold  [ ] Reject', '**Comments:**');
    return L.join('\n');
  }
}

async function listSwarmAgents() {
  return await runPython('listSwarmAgents');
}

async function orchestrateSwarm(resume, role = 'Software Engineer', location = 'India', company = 'Target Enterprise') {
  return await runPython('orchestrateSwarm', { resume, role, location, company });
}

module.exports = {
  listModels, analyze, genQuestions, draftEmail, screen,
  recommendJobs, boostResume, buildRoadmap, evalAnswer, autoApply, searchLiveJobs,
  listSwarmAgents, orchestrateSwarm,
  overallScore, skillCoverage, atsChecks,
  jdCheck, keywordMatch, maskPii,
  reportMarkdown, scorecardMarkdown
};
