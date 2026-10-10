import sys
import json
import os

# Add parent directory to sys.path to import agent and extras
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import agent
import extras
import multi_agents

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"error": "No input provided"}))
            return
            
        req = json.loads(input_data)
        func_name = req.get("func")
        args = req.get("args", {})
        
        res = None
        if func_name == "listModels":
            models, err = agent.list_models()
            if err:
                res = {"error": err}
            else:
                res = {"models": models}
        elif func_name == "listSwarmAgents":
            res = multi_agents.swarm_orchestrator.list_agents()
        elif func_name == "orchestrateSwarm":
            res = multi_agents.swarm_orchestrator.orchestrate_swarm(
                args["resume"],
                args.get("role", "Software Engineer"),
                args.get("location", "India"),
                args.get("company", "Target Enterprise")
            )
        elif func_name == "analyze":
            res = agent.analyze(args["resume"], args["jd"])
        elif func_name == "genQuestions":
            res = agent.gen_questions(args["analysis"], args["jd"], args.get("n", 8), args.get("focus", "Balanced"), args.get("difficulty", "Mixed"))
        elif func_name == "draftEmail":
            res = agent.draft_email(args["kind"], args["analysis"])
        elif func_name == "screen":
            res = agent.screen(args["resume"], args["jd"], args.get("n", 8), args.get("focus", "Balanced"), args.get("difficulty", "Mixed"))
            # Python ats_checks returns list of tuples, JS expects list of objects with label and passed
            res["ats"] = [{"label": l, "passed": p} for l, p in res["ats"]]
        elif func_name == "recommendJobs":
            res = extras.recommend_jobs(args["resume"], args.get("prefs", ""))
        elif func_name == "boostResume":
            res = extras.boost_resume(args["resume"], args["role"])
        elif func_name == "buildRoadmap":
            res = extras.build_roadmap(args["resume"], args["role"])
        elif func_name == "evalAnswer":
            res = extras.eval_answer(args["question"], args["answer"], args["role"])
        elif func_name == "autoApply":
            res = extras.auto_apply(args["resume"], args["job_description"], args.get("company", "Target Enterprise"))
        elif func_name == "searchLiveJobs":
            res = extras.search_live_jobs(args["query"], args.get("location", "Remote"))
        elif func_name == "overallScore":
            res = agent.overall_score(args["scores"], args["weights"])
        elif func_name == "skillCoverage":
            res = agent.skill_coverage(args["a"])
        elif func_name == "atsChecks":
            ats = agent.ats_checks(args["text"])
            res = [{"label": l, "passed": p} for l, p in ats]
        elif func_name == "jdCheck":
            res = extras.jd_check(args["jd"])
            # Format to match JS expectation: {flags: [{word, suggestion}], words, max_years, must_have_lines}
            res["flags"] = [{"word": w, "suggestion": s} for w, s in res["flags"]]
        elif func_name == "keywordMatch":
            f, m, p = extras.keyword_match(args["resume"], args["jd"])
            res = {"found": f, "missing": m, "pct": p}
        elif func_name == "maskPii":
            res = extras.mask_pii(args["text"])
        elif func_name == "reportMarkdown":
            res = agent.report_markdown(args["data"], args["overall"])
        elif func_name == "scorecardMarkdown":
            res = agent.scorecard_markdown(args["data"])
        else:
            print(json.dumps({"error": f"Unknown function {func_name}"}))
            return

        print(json.dumps({"result": res}))
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))

if __name__ == "__main__":
    main()
