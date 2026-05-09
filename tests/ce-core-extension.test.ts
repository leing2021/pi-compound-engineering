import { describe, expect, test } from "bun:test"
import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import ceCoreExtension from "../extensions/ce-core/index"
import {
  getBrainstormArtifactPath,
  getPlanArtifactPath,
  getSolutionArtifactPath,
  getRunArtifactPath,
} from "../extensions/ce-core/utils/artifact-paths"
import { createArtifactHelperTool } from "../extensions/ce-core/tools/artifact-helper"
import { createAskUserQuestionTool } from "../extensions/ce-core/tools/ask-user-question"
import { createSubagentTool } from "../extensions/ce-core/tools/subagent"
import { createWorkflowStateTool } from "../extensions/ce-core/tools/workflow-state"
import { createWorktreeManagerTool } from "../extensions/ce-core/tools/worktree-manager"
import { createReviewRouterTool } from "../extensions/ce-core/tools/review-router"
import { createParallelSubagentTool } from "../extensions/ce-core/tools/parallel-subagent"
import { createSessionCheckpointTool } from "../extensions/ce-core/tools/session-checkpoint"
import { createTaskSplitterTool } from "../extensions/ce-core/tools/task-splitter"
import { createBrainstormDialogTool } from "../extensions/ce-core/tools/brainstorm-dialog"
import { createPlanDiffTool } from "../extensions/ce-core/tools/plan-diff"
import { createSessionHistoryTool } from "../extensions/ce-core/tools/session-history"
import { createPatternExtractorTool } from "../extensions/ce-core/tools/pattern-extractor"
import { normalizeSlug } from "../extensions/ce-core/utils/name-utils"
import {
  checkSubagentDepth,
  getChildDepthEnv,
  DEFAULT_MAX_SUBAGENT_DEPTH,
} from "../extensions/ce-core/tools/subagent-depth-guard"

describe("artifact paths", () => {
  const repoRoot = "/tmp/pi-ce-repo"

  test("builds the brainstorm artifact path", () => {
    expect(getBrainstormArtifactPath(repoRoot, "2026-04-17", "Pi CE Package")).toBe(
      path.join(repoRoot, "docs", "brainstorms", "2026-04-17-pi-ce-package-requirements.md"),
    )
  })

  test("builds the plan artifact path", () => {
    expect(getPlanArtifactPath(repoRoot, "2026-04-17", "Pi CE Package")).toBe(
      path.join(repoRoot, "docs", "plans", "2026-04-17-pi-ce-package-plan.md"),
    )
  })

  test("builds the solution artifact path by category", () => {
    expect(getSolutionArtifactPath(repoRoot, "workflow", "package bootstrap", "2026-04-17")).toBe(
      path.join(repoRoot, "docs", "solutions", "workflow", "2026-04-17-package-bootstrap.md"),
    )
  })

  test("builds the run artifact path", () => {
    expect(getRunArtifactPath(repoRoot, "ce-review", "run-001")).toBe(
      path.join(repoRoot, ".context", "compound-engineering", "ce-review", "run-001"),
    )
  })
})

describe("slug normalization", () => {
  test("normalizes mixed-case and punctuation-heavy labels", () => {
    expect(normalizeSlug("Pi CE: Package! Design")).toBe("pi-ce-package-design")
  })

  test("collapses repeated separators and trims edges", () => {
    expect(normalizeSlug("---Brainstorm___Plan---")).toBe("brainstorm-plan")
  })
})

describe("artifact_helper", () => {
  test("suggests a brainstorm artifact path", async () => {
    const tool = createArtifactHelperTool()
    const result = await tool.execute({
      repoRoot: "/tmp/pi-ce-repo",
      artifactType: "brainstorm",
      date: "2026-04-17",
      topic: "Pi CE Package",
    })

    expect(result.path).toBe(
      "/tmp/pi-ce-repo/docs/brainstorms/2026-04-17-pi-ce-package-requirements.md",
    )
    expect(result.createdDirectories).toEqual([])
  })

  test("creates missing directories for a solution artifact", async () => {
    const repoRoot = "/tmp/pi-ce-artifact-helper"
    const tool = createArtifactHelperTool()

    const result = await tool.execute({
      repoRoot,
      artifactType: "solution",
      date: "2026-04-17",
      topic: "Package Bootstrap",
      category: "workflow",
      ensureDir: true,
    })

    expect(result.path).toBe(
      "/tmp/pi-ce-artifact-helper/docs/solutions/workflow/2026-04-17-package-bootstrap.md",
    )
    expect(result.createdDirectories).toContain(
      "/tmp/pi-ce-artifact-helper/docs/solutions/workflow",
    )
  })

  test("creates the run artifact directory when ensureDir is true", async () => {
    const repoRoot = "/tmp/pi-ce-run-artifact"
    const tool = createArtifactHelperTool()

    const result = await tool.execute({
      repoRoot,
      artifactType: "run",
      skillName: "ce-review",
      runId: "run-001",
      ensureDir: true,
    })

    expect(result.path).toBe(
      "/tmp/pi-ce-run-artifact/.context/compound-engineering/ce-review/run-001",
    )
    expect(result.createdDirectories).toContain(
      "/tmp/pi-ce-run-artifact/.context/compound-engineering/ce-review",
    )
  })

  test("does not create directories when ensureDir is false or absent", async () => {
    const tool = createArtifactHelperTool()

    const result = await tool.execute({
      repoRoot: "/tmp/pi-ce-no-dir",
      artifactType: "brainstorm",
      date: "2026-04-17",
      topic: "Test",
      ensureDir: false,
    })

    expect(result.path).toBe(
      "/tmp/pi-ce-no-dir/docs/brainstorms/2026-04-17-test-requirements.md",
    )
    expect(result.createdDirectories).toEqual([])
  })
})

describe("ask_user_question", () => {
  test("supports free input mode", async () => {
    const tool = createAskUserQuestionTool()
    const result = await tool.execute(
      { question: "What should we build?" },
      {
        input: async () => "Plan workflow",
        select: async () => null,
      },
    )

    expect(result.answer).toBe("Plan workflow")
    expect(result.mode).toBe("input")
  })

  test("supports fixed-options mode without custom", async () => {
    const tool = createAskUserQuestionTool()
    const result = await tool.execute(
      { question: "Choose next step", options: ["brainstorm", "plan"], allowCustom: false },
      {
        input: async () => null,
        select: async () => "plan",
      },
    )

    expect(result.answer).toBe("plan")
    expect(result.mode).toBe("select")
  })

  test("defaults to allowing custom answers when options are provided", async () => {
    const tool = createAskUserQuestionTool()
    const result = await tool.execute(
      { question: "Choose next step", options: ["brainstorm", "plan"] },
      {
        input: async () => "compound",
        select: async () => "Other",
      },
    )

    expect(result.answer).toBe("compound")
    expect(result.mode).toBe("custom")
  })
})

describe("subagent", () => {
  test("tool is named ce_subagent", () => {
    const tool = createSubagentTool()
    expect(tool.name).toBe("ce_subagent")
  })

  test("runs a single subagent task", async () => {
    const calls: string[] = []
    const tool = createSubagentTool()

    const result = await tool.execute(
      {
        agent: "ce-plan",
        task: "Design the package",
      },
      async (prompt: string) => {
        calls.push(prompt)
        return "ok"
      },
    )

    expect(calls).toEqual(["/skill:ce-plan Design the package"])
    expect(result.mode).toBe("single")
    expect(result.outputs).toEqual(["ok"])
  })

  test("runs a serial chain and substitutes the previous result", async () => {
    const calls: string[] = []
    const tool = createSubagentTool()

    const result = await tool.execute(
      {
        chain: [
          { agent: "ce-brainstorm", task: "Scope the feature" },
          { agent: "ce-plan", task: "Plan using {previous}" },
        ],
      },
      async (prompt: string) => {
        calls.push(prompt)
        return prompt.includes("ce-brainstorm") ? "requirements-path" : "plan-path"
      },
    )

    expect(calls).toEqual([
      "/skill:ce-brainstorm Scope the feature",
      "/skill:ce-plan Plan using requirements-path",
    ])
    expect(result.mode).toBe("chain")
    expect(result.outputs).toEqual(["requirements-path", "plan-path"])
  })

  test("rejects mixed execution modes", async () => {
    const tool = createSubagentTool()

    await expect(
      tool.execute(
        {
          agent: "ce-plan",
          task: "Design the package",
          chain: [{ agent: "ce-brainstorm", task: "Scope the feature" }],
        },
        async () => "ok",
      ),
    ).rejects.toThrow("Provide exactly one mode")
  })

  test("rejects empty agent in single mode", async () => {
    const tool = createSubagentTool()

    await expect(
      tool.execute(
        { agent: "", task: "Design the package" },
        async () => "ok",
      ),
    ).rejects.toThrow()
  })

  test("rejects empty task in single mode", async () => {
    const tool = createSubagentTool()

    await expect(
      tool.execute(
        { agent: "ce-plan", task: "" },
        async () => "ok",
      ),
    ).rejects.toThrow()
  })

  test("rejects empty chain array", async () => {
    const tool = createSubagentTool()

    await expect(
      tool.execute({ chain: [] }, async () => "ok"),
    ).rejects.toThrow("Provide exactly one mode")
  })
})

describe("workflow_state", () => {
  test("reports empty state when no artifacts exist", async () => {
    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot: "/tmp/pi-ce-empty-repo-" + Date.now() })

    expect(result.brainstorms.count).toBe(0)
    expect(result.plans.count).toBe(0)
    expect(result.solutions.count).toBe(0)
    expect(result.runs.count).toBe(0)
    expect(result.brainstorms.latest).toBeNull()
    expect(result.plans.latest).toBeNull()
    expect(result.solutions.latest).toBeNull()
    expect(result.runs.latest).toBeNull()
  })

  test("reports brainstorm count and latest when artifacts exist", async () => {
    const repoRoot = "/tmp/pi-ce-ws-brainstorm"
    const brainstormDir = path.join(repoRoot, "docs", "brainstorms")
    await mkdir(brainstormDir, { recursive: true })
    await writeFile(path.join(brainstormDir, "2026-04-17-test-requirements.md"), "content")

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.brainstorms.count).toBe(1)
    expect(result.brainstorms.latest).toBe("2026-04-17-test-requirements.md")
    expect(result.plans.count).toBe(0)
  })

  test("reports solutions recursively across subcategories", async () => {
    const repoRoot = "/tmp/pi-ce-ws-solutions"
    const solDir = path.join(repoRoot, "docs", "solutions", "integration")
    await mkdir(solDir, { recursive: true })
    await writeFile(path.join(solDir, "2026-04-17-npm-publish.md"), "content")

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.solutions.count).toBe(1)
    expect(result.solutions.latest).toContain("npm-publish")
  })

  test("picks the most recent artifact as latest", async () => {
    const repoRoot = "/tmp/pi-ce-ws-multi"
    const planDir = path.join(repoRoot, "docs", "plans")
    await mkdir(planDir, { recursive: true })
    await writeFile(path.join(planDir, "2026-04-16-old-plan.md"), "old")
    await writeFile(path.join(planDir, "2026-04-17-new-plan.md"), "new")

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.plans.count).toBe(2)
    expect(result.plans.latest).toBe("2026-04-17-new-plan.md")
  })

  // --- Unit 3: workflow_state.context runtime-state discovery ---

  test("context returns safe empty state when no context-state.json exists", async () => {
    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot: `/tmp/pi-ce-ws-no-context-${Date.now()}` })

    expect(result.context).toBeDefined()
    expect(result.context.found).toBe(false)
    expect(result.context.currentTruth).toEqual([])
    expect(result.context.invalidatedAssumptions).toEqual([])
    expect(result.context.openDecisions).toEqual([])
    expect(result.context.recentlyAccessedFiles).toEqual([])
    expect(result.context.compressionRisk).toEqual([])
  })

  test("context reads structured fields from context-state.json", async () => {
    const repoRoot = `/tmp/pi-ce-ws-ctx-${Date.now()}`
    const ctxDir = path.join(repoRoot, ".context", "compound-engineering")
    await mkdir(ctxDir, { recursive: true })
    await writeFile(
      path.join(ctxDir, "context-state.json"),
      JSON.stringify({
        currentStage: "03-work",
        nextStage: "04-review",
        contextHealth: "watch",
        latestHandoffPath: ".context/compound-engineering/handoffs/latest.md",
        latestDatedHandoffPath: ".context/compound-engineering/handoffs/2026-04-30.md",
        activeFiles: ["src/a.ts", "src/b.ts"],
        recentlyAccessedFiles: ["src/a.ts", "src/b.ts", "src/c.ts"],
        blocker: "N/A",
        verification: "bun test passed",
        currentTruth: ["Fact A"],
        invalidatedAssumptions: ["Old assumption"],
        openDecisions: ["Decision X"],
        compressionRisk: ["Risk Z"],
        recommendNewSession: false,
        updatedAt: "2026-04-30T00:00:00.000Z",
      }),
    )

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.context.found).toBe(true)
    expect(result.context.currentStage).toBe("03-work")
    expect(result.context.nextStage).toBe("04-review")
    expect(result.context.contextHealth).toBe("watch")
    expect(result.context.latestHandoffPath).toBe(".context/compound-engineering/handoffs/latest.md")
    expect(result.context.latestDatedHandoffPath).toBe(".context/compound-engineering/handoffs/2026-04-30.md")
    expect(result.context.activeFiles).toEqual(["src/a.ts", "src/b.ts"])
    expect(result.context.recentlyAccessedFiles).toEqual(["src/a.ts", "src/b.ts", "src/c.ts"])
    expect(result.context.blocker).toBe("N/A")
    expect(result.context.verification).toBe("bun test passed")
    expect(result.context.currentTruth).toEqual(["Fact A"])
    expect(result.context.invalidatedAssumptions).toEqual(["Old assumption"])
    expect(result.context.openDecisions).toEqual(["Decision X"])
    expect(result.context.compressionRisk).toEqual(["Risk Z"])
    expect(result.context.recommendNewSession).toBe(false)
    expect(result.context.updatedAt).toBe("2026-04-30T00:00:00.000Z")
  })

  test("context returns safe defaults for malformed context-state.json", async () => {
    const repoRoot = `/tmp/pi-ce-ws-ctx-malformed-${Date.now()}`
    const ctxDir = path.join(repoRoot, ".context", "compound-engineering")
    await mkdir(ctxDir, { recursive: true })
    await writeFile(path.join(ctxDir, "context-state.json"), "NOT VALID JSON{{{")

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.context.found).toBe(false)
    expect(result.context.currentTruth).toEqual([])
    expect(result.context.activeFiles).toEqual([])
  })

  test("context filters non-string array entries from context-state.json", async () => {
    const repoRoot = `/tmp/pi-ce-ws-ctx-array-filter-${Date.now()}`
    const ctxDir = path.join(repoRoot, ".context", "compound-engineering")
    await mkdir(ctxDir, { recursive: true })
    await writeFile(
      path.join(ctxDir, "context-state.json"),
      JSON.stringify({
        currentStage: "03-work",
        activeFiles: ["src/a.ts", 42, null],
        recentlyAccessedFiles: ["src/b.ts", false],
        currentTruth: ["Fact A", { nope: true }],
        invalidatedAssumptions: ["Old assumption", 123],
        openDecisions: ["Decision X", []],
        compressionRisk: ["Risk Z", null],
      }),
    )

    const tool = createWorkflowStateTool()
    const result = await tool.execute({ repoRoot })

    expect(result.context.found).toBe(true)
    expect(result.context.activeFiles).toEqual(["src/a.ts"])
    expect(result.context.recentlyAccessedFiles).toEqual(["src/b.ts"])
    expect(result.context.currentTruth).toEqual(["Fact A"])
    expect(result.context.invalidatedAssumptions).toEqual(["Old assumption"])
    expect(result.context.openDecisions).toEqual(["Decision X"])
    expect(result.context.compressionRisk).toEqual(["Risk Z"])
  })
})

describe("worktree_manager", () => {
  test("create operation generates correct git commands", async () => {
    const calls: string[][] = []
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "create",
        repoRoot: "/tmp/my-repo",
        branchName: "feat-add-ci",
      },
      async (args: string[]) => {
        calls.push(args)
        return ""
      },
    )

    expect(calls.length).toBe(2)
    // Branch creation
    expect(calls[0]).toContain("branch")
    expect(calls[0]).toContain("feat-add-ci")
    // Worktree add
    expect(calls[1]).toContain("worktree")
    expect(calls[1]).toContain("add")
    expect(result.worktreePath).toContain("feat-add-ci")
  })

  test("detect operation returns false when not in a worktree", async () => {
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "detect",
        repoRoot: "/tmp/my-repo",
      },
      async () => "",
    )

    expect(result.isWorktree).toBe(false)
  })

  test("detect operation returns true when in a worktree", async () => {
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "detect",
        repoRoot: "/tmp/my-repo",
      },
      async (args: string[]) => {
        if (args.includes("worktree") && args.includes("list")) {
          return "/tmp/my-repo  abc123 [main]\n/tmp/my-repo-feat  def456 [feat-add-ci]"
        }
        return ""
      },
    )

    expect(result.isWorktree).toBe(true)
    expect(result.worktreePath).toBe("/tmp/my-repo-feat")
  })

  test("merge operation generates correct git commands", async () => {
    const calls: string[][] = []
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "merge",
        repoRoot: "/tmp/my-repo",
        branchName: "feat-add-ci",
      },
      async (args: string[]) => {
        calls.push(args)
        return ""
      },
    )

    // Checkout main, merge branch
    expect(calls[0]).toContain("checkout")
    expect(calls[0]).toContain("main")
    expect(calls[1]).toContain("merge")
    expect(calls[1]).toContain("feat-add-ci")
    expect(result.merged).toBe(true)
  })

  test("cleanup operation removes the worktree", async () => {
    const calls: string[][] = []
    const tool = createWorktreeManagerTool()

    const result = await tool.execute(
      {
        operation: "cleanup",
        repoRoot: "/tmp/my-repo",
        branchName: "feat-add-ci",
        worktreePath: "/tmp/my-repo-feat-add-ci",
      },
      async (args: string[]) => {
        calls.push(args)
        return ""
      },
    )

    expect(calls[0]).toContain("worktree")
    expect(calls[0]).toContain("remove")
    expect(calls[0]).toContain("/tmp/my-repo-feat-add-ci")
    expect(calls[1]).toContain("branch")
    expect(calls[1]).toContain("-d")
    expect(calls[1]).toContain("feat-add-ci")
    expect(result.cleanedUp).toBe(true)
  })

  test("rejects unknown operations", async () => {
    const tool = createWorktreeManagerTool()

    await expect(
      tool.execute(
        { operation: "unknown" as any, repoRoot: "/tmp/my-repo" },
        async () => "",
      ),
    ).rejects.toThrow("Unknown operation")
  })
})

describe("review_router", () => {
  test("returns base reviewers for any non-empty diff", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/index.ts"],
      insertions: 10,
      deletions: 2,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("correctness-reviewer")
    expect(names).toContain("testing-reviewer")
    expect(names).toContain("maintainability-reviewer")
    expect(result.reviewers.length).toBeGreaterThanOrEqual(3)
  })

  test("adds security reviewer when auth-related paths are changed", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/auth/login.ts", "src/middleware/permissions.ts"],
      insertions: 50,
      deletions: 10,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("security-reviewer")
  })

  test("adds performance reviewer when data/query paths are changed", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/db/queries.ts", "src/cache/manager.ts"],
      insertions: 30,
      deletions: 5,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("performance-reviewer")
  })

  test("adds integration reviewer when config or CI files change", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: [".github/workflows/test.yml", "package.json"],
      insertions: 15,
      deletions: 3,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("integration-reviewer")
  })

  test("large diffs add thoroughness reviewer", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/core.ts", "src/utils.ts", "src/main.ts", "src/config.ts", "src/types.ts", "src/helpers.ts"],
      insertions: 500,
      deletions: 200,
    })

    const names = result.reviewers.map(r => r.name)
    expect(names).toContain("thoroughness-reviewer")
  })

  test("each reviewer includes a reason", async () => {
    const tool = createReviewRouterTool()
    const result = await tool.execute({
      filesChanged: ["src/auth/token.ts"],
      insertions: 20,
      deletions: 5,
    })

    for (const reviewer of result.reviewers) {
      expect(reviewer.reason).toBeTruthy()
      expect(typeof reviewer.reason).toBe("string")
    }
  })
})

describe("parallel_subagent", () => {
  test("tool is named ce_parallel_subagent", () => {
    const tool = createParallelSubagentTool()
    expect(tool.name).toBe("ce_parallel_subagent")
  })

  test("runs multiple tasks concurrently and returns all outputs", async () => {
    const calls: string[] = []
    const tool = createParallelSubagentTool()

    const result = await tool.execute(
      {
        tasks: [
          { agent: "ce-brainstorm", task: "Scope feature A" },
          { agent: "ce-brainstorm", task: "Scope feature B" },
          { agent: "ce-plan", task: "Plan feature C" },
        ],
      },
      async (prompt: string) => {
        calls.push(prompt)
        return `result-${calls.length}`
      },
    )

    expect(result.outputs.length).toBe(3)
    expect(result.outputs.map(o => o.status)).toEqual(["fulfilled", "fulfilled", "fulfilled"])
    expect(result.outputs[0].value).toBe("result-1")
    expect(result.outputs[1].value).toBe("result-2")
    expect(result.outputs[2].value).toBe("result-3")
  })

  test("handles individual task failures gracefully", async () => {
    const tool = createParallelSubagentTool()

    const result = await tool.execute(
      {
        tasks: [
          { agent: "ce-brainstorm", task: "Good task" },
          { agent: "ce-plan", task: "Fail task" },
          { agent: "ce-work", task: "Another good task" },
        ],
      },
      async (prompt: string) => {
        if (prompt.includes("Fail")) throw new Error("Task failed")
        return "ok"
      },
    )

    expect(result.outputs.length).toBe(3)
    expect(result.outputs[0].status).toBe("fulfilled")
    expect(result.outputs[0].value).toBe("ok")
    expect(result.outputs[1].status).toBe("rejected")
    expect(result.outputs[1].reason).toContain("Task failed")
    expect(result.outputs[2].status).toBe("fulfilled")
    expect(result.outputs[2].value).toBe("ok")
  })

  test("rejects empty task array", async () => {
    const tool = createParallelSubagentTool()

    await expect(
      tool.execute({ tasks: [] }, async () => ""),
    ).rejects.toThrow("at least one task")
  })

  test("returns results in the same order as input tasks", async () => {
    const tool = createParallelSubagentTool()

    const result = await tool.execute(
      {
        tasks: [
          { agent: "ce-work", task: "Slow task" },
          { agent: "ce-plan", task: "Fast task" },
        ],
      },
      async (prompt: string) => {
        if (prompt.includes("Slow")) {
          await new Promise(r => setTimeout(r, 50))
          return "slow-done"
        }
        return "fast-done"
      },
    )

    expect(result.outputs[0].value).toBe("slow-done")
    expect(result.outputs[1].value).toBe("fast-done")
  })
})

describe("subagent_depth_guard", () => {
  const originalDepth = process.env.PI_SUBAGENT_DEPTH
  const originalMax = process.env.PI_SUBAGENT_MAX_DEPTH

  const cleanup = () => {
    if (originalDepth === undefined) {
      delete process.env.PI_SUBAGENT_DEPTH
    } else {
      process.env.PI_SUBAGENT_DEPTH = originalDepth
    }
    if (originalMax === undefined) {
      delete process.env.PI_SUBAGENT_MAX_DEPTH
    } else {
      process.env.PI_SUBAGENT_MAX_DEPTH = originalMax
    }
  }

  test("defaults to depth=0, max=2 when env vars unset", () => {
    delete process.env.PI_SUBAGENT_DEPTH
    delete process.env.PI_SUBAGENT_MAX_DEPTH

    const result = checkSubagentDepth()
    expect(result.allowed).toBe(true)
    expect(result.depth).toBe(0)
    expect(result.max).toBe(DEFAULT_MAX_SUBAGENT_DEPTH)

    cleanup()
  })

  test("allows execution at depth < max", () => {
    process.env.PI_SUBAGENT_DEPTH = "1"
    process.env.PI_SUBAGENT_MAX_DEPTH = "3"

    const result = checkSubagentDepth()
    expect(result.allowed).toBe(true)
    expect(result.depth).toBe(1)
    expect(result.max).toBe(3)

    cleanup()
  })

  test("blocks execution at depth >= max", () => {
    process.env.PI_SUBAGENT_DEPTH = "2"
    process.env.PI_SUBAGENT_MAX_DEPTH = "2"

    const result = checkSubagentDepth()
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("depth limit reached")

    cleanup()
  })

  test("blocks execution at depth > max", () => {
    process.env.PI_SUBAGENT_DEPTH = "5"
    process.env.PI_SUBAGENT_MAX_DEPTH = "2"

    const result = checkSubagentDepth()
    expect(result.allowed).toBe(false)

    cleanup()
  })

  test("depth=0, max=0 disables subagent entirely", () => {
    process.env.PI_SUBAGENT_DEPTH = "0"
    process.env.PI_SUBAGENT_MAX_DEPTH = "0"

    const result = checkSubagentDepth()
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("depth limit reached")

    cleanup()
  })

  test("handles invalid depth as 0", () => {
    process.env.PI_SUBAGENT_DEPTH = "not-a-number"
    process.env.PI_SUBAGENT_MAX_DEPTH = "2"

    const result = checkSubagentDepth()
    expect(result.allowed).toBe(true)
    expect(result.depth).toBe(0)

    cleanup()
  })

  test("handles invalid max as default", () => {
    process.env.PI_SUBAGENT_DEPTH = "0"
    process.env.PI_SUBAGENT_MAX_DEPTH = "not-a-number"

    const result = checkSubagentDepth()
    expect(result.allowed).toBe(true)
    expect(result.max).toBe(DEFAULT_MAX_SUBAGENT_DEPTH)

    cleanup()
  })

  test("getChildDepthEnv increments depth and preserves max", () => {
    process.env.PI_SUBAGENT_DEPTH = "1"
    process.env.PI_SUBAGENT_MAX_DEPTH = "3"

    const env = getChildDepthEnv()
    expect(env.PI_SUBAGENT_DEPTH).toBe("2")
    expect(env.PI_SUBAGENT_MAX_DEPTH).toBe("3")

    cleanup()
  })

  test("getChildDepthEnv accepts custom maxDepth override", () => {
    process.env.PI_SUBAGENT_DEPTH = "0"
    process.env.PI_SUBAGENT_MAX_DEPTH = "2"

    const env = getChildDepthEnv({ maxDepth: 1 })
    expect(env.PI_SUBAGENT_DEPTH).toBe("1")
    expect(env.PI_SUBAGENT_MAX_DEPTH).toBe("1")

    cleanup()
  })

  test("subagent tool blocks execution when depth exceeded", async () => {
    process.env.PI_SUBAGENT_DEPTH = "2"
    process.env.PI_SUBAGENT_MAX_DEPTH = "2"

    const tool = createSubagentTool()
    await expect(
      tool.execute(
        { agent: "ce-plan", task: "test" },
        async () => "ok",
      ),
    ).rejects.toThrow("depth limit reached")

    cleanup()
  })

  test("parallel_subagent tool blocks execution when depth exceeded", async () => {
    process.env.PI_SUBAGENT_DEPTH = "2"
    process.env.PI_SUBAGENT_MAX_DEPTH = "2"

    const tool = createParallelSubagentTool()
    await expect(
      tool.execute(
        { tasks: [{ agent: "ce-plan", task: "test" }] },
        async () => "ok",
      ),
    ).rejects.toThrow("depth limit reached")

    cleanup()
  })

  test("subagent tool passes execOptions with depth env", async () => {
    delete process.env.PI_SUBAGENT_DEPTH
    delete process.env.PI_SUBAGENT_MAX_DEPTH

    const capturedOptions: import("../extensions/ce-core/tools/subagent").SubagentExecOptions[] = []
    const tool = createSubagentTool()

    await tool.execute(
      { agent: "ce-plan", task: "test" },
      async (_prompt, options) => {
        capturedOptions.push(options ?? {})
        return "ok"
      },
    )

    expect(capturedOptions.length).toBe(1)
    expect(capturedOptions[0].extraEnv?.PI_SUBAGENT_DEPTH).toBe("1")
    expect(capturedOptions[0].extraEnv?.PI_SUBAGENT_MAX_DEPTH).toBe(String(DEFAULT_MAX_SUBAGENT_DEPTH))

    cleanup()
  })

  test("subagent with inheritSkills=false passes --no-skills", async () => {
    delete process.env.PI_SUBAGENT_DEPTH
    delete process.env.PI_SUBAGENT_MAX_DEPTH

    const capturedOptions: import("../extensions/ce-core/tools/subagent").SubagentExecOptions[] = []
    const tool = createSubagentTool()

    await tool.execute(
      { agent: "ce-plan", task: "test", inheritSkills: false },
      async (_prompt, options) => {
        capturedOptions.push(options ?? {})
        return "ok"
      },
    )

    expect(capturedOptions.length).toBe(1)
    expect(capturedOptions[0].extraFlags).toContain("--no-skills")

    cleanup()
  })

  test("subagent with inheritSkills=true does not pass --no-skills", async () => {
    delete process.env.PI_SUBAGENT_DEPTH
    delete process.env.PI_SUBAGENT_MAX_DEPTH

    const capturedOptions: import("../extensions/ce-core/tools/subagent").SubagentExecOptions[] = []
    const tool = createSubagentTool()

    await tool.execute(
      { agent: "ce-plan", task: "test", inheritSkills: true },
      async (_prompt, options) => {
        capturedOptions.push(options ?? {})
        return "ok"
      },
    )

    expect(capturedOptions.length).toBe(1)
    expect(capturedOptions[0].extraFlags).toBeUndefined()

    cleanup()
  })

  test("parallel_subagent defaults to inheritSkills=false (no skills)", async () => {
    delete process.env.PI_SUBAGENT_DEPTH
    delete process.env.PI_SUBAGENT_MAX_DEPTH

    const capturedOptions: import("../extensions/ce-core/tools/subagent").SubagentExecOptions[] = []
    const tool = createParallelSubagentTool()

    await tool.execute(
      { tasks: [{ agent: "ce-plan", task: "test" }] },
      async (_prompt, options) => {
        capturedOptions.push(options ?? {})
        return "ok"
      },
    )

    expect(capturedOptions.length).toBe(1)
    expect(capturedOptions[0].extraFlags).toContain("--no-skills")

    cleanup()
  })

  test("parallel_subagent with inheritSkills=true keeps skills", async () => {
    delete process.env.PI_SUBAGENT_DEPTH
    delete process.env.PI_SUBAGENT_MAX_DEPTH

    const capturedOptions: import("../extensions/ce-core/tools/subagent").SubagentExecOptions[] = []
    const tool = createParallelSubagentTool()

    await tool.execute(
      { tasks: [{ agent: "ce-plan", task: "test" }], inheritSkills: true },
      async (_prompt, options) => {
        capturedOptions.push(options ?? {})
        return "ok"
      },
    )

    expect(capturedOptions.length).toBe(1)
    expect(capturedOptions[0].extraFlags).toBeUndefined()

    cleanup()
  })
})

describe("session_checkpoint", () => {
  test("save creates a checkpoint file", async () => {
    const repoRoot = `/tmp/pi-ce-cp-save-${Date.now()}`
    const tool = createSessionCheckpointTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
      completedUnits: ["Unit 1: test.yml", "Unit 2: publish.yml"],
    })

    const result = await tool.execute({
      operation: "load",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
    })

    expect(result.planPath).toBe("docs/plans/2026-04-18-ci-cd-plan.md")
    expect(result.completedUnits).toEqual(["Unit 1: test.yml", "Unit 2: publish.yml"])
    expect(result.updatedAt).toBeTruthy()
  })

  test("load returns empty array when no checkpoint exists", async () => {
    const tool = createSessionCheckpointTool()

    const result = await tool.execute({
      operation: "load",
      repoRoot: `/tmp/pi-ce-cp-empty-${Date.now()}`,
      planPath: "docs/plans/nonexistent.md",
    })

    expect(result.completedUnits).toEqual([])
  })

  test("save appends additional completed units", async () => {
    const repoRoot = `/tmp/pi-ce-cp-append-${Date.now()}`
    const tool = createSessionCheckpointTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
      completedUnits: ["Unit 1"],
    })

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
      completedUnits: ["Unit 1", "Unit 2", "Unit 3"],
    })

    const result = await tool.execute({
      operation: "load",
      repoRoot,
      planPath: "docs/plans/2026-04-18-ci-cd-plan.md",
    })

    expect(result.completedUnits).toEqual(["Unit 1", "Unit 2", "Unit 3"])
  })

  test("list returns all checkpoints", async () => {
    const repoRoot = `/tmp/pi-ce-cp-list-${Date.now()}`
    const tool = createSessionCheckpointTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/plan-a.md",
      completedUnits: ["Unit 1"],
    })

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/plan-b.md",
      completedUnits: ["Unit 1", "Unit 2"],
    })

    const result = await tool.execute({
      operation: "list",
      repoRoot,
    })

    expect(result.checkpoints?.length).toBe(2)
    const paths = (result.checkpoints ?? []).map((c: { planPath: string }) => c.planPath)
    expect(paths).toContain("docs/plans/plan-a.md")
    expect(paths).toContain("docs/plans/plan-b.md")
  })

  test("rejects unknown operations", async () => {
    const tool = createSessionCheckpointTool()

    await expect(
      tool.execute({
        operation: "unknown" as any,
        repoRoot: "/tmp/test",
        planPath: "docs/plans/test.md",
      }),
    ).rejects.toThrow("Unknown operation")
  })

  test("fail records error context on a checkpoint", async () => {
    const repoRoot = `/tmp/pi-ce-cp-fail-${Date.now()}`
    const tool = createSessionCheckpointTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/plan-a.md",
      completedUnits: ["Unit 1"],
    })

    const result = await tool.execute({
      operation: "fail",
      repoRoot,
      planPath: "docs/plans/plan-a.md",
      failedUnit: "Unit 2: auth module",
      error: "TypeError: Cannot read property 'token' of undefined",
    })

    expect(result.status).toBe("failed")
    expect(result.failedUnit).toBe("Unit 2: auth module")
    expect(result.error).toContain("TypeError")
    expect(result.completedUnits).toEqual(["Unit 1"])
  })

  test("retry returns retry strategy for a failed checkpoint", async () => {
    const repoRoot = `/tmp/pi-ce-cp-retry-${Date.now()}`
    const tool = createSessionCheckpointTool()

    await tool.execute({
      operation: "save",
      repoRoot,
      planPath: "docs/plans/plan-b.md",
      completedUnits: ["Unit 1", "Unit 2"],
    })

    await tool.execute({
      operation: "fail",
      repoRoot,
      planPath: "docs/plans/plan-b.md",
      failedUnit: "Unit 3",
      error: "Test timeout",
    })

    const result = await tool.execute({
      operation: "retry",
      repoRoot,
      planPath: "docs/plans/plan-b.md",
    })

    expect(result.status).toBe("retry")
    expect(result.retryFrom).toBe("Unit 3")
    expect(result.completedUnits).toEqual(["Unit 1", "Unit 2"])
    expect(result.strategy).toBeTruthy()
  })
})

describe("task_splitter", () => {
  test("all independent units are parallel-safe", () => {
    const tool = createTaskSplitterTool()

    const result = tool.execute({
      units: [
        { name: "Unit 1: auth", files: ["src/auth.ts"] },
        { name: "Unit 2: docs", files: ["README.md"] },
        { name: "Unit 3: CI", files: [".github/workflows/test.yml"] },
      ],
    })

    expect(result.groups.length).toBe(3)
    for (const group of result.groups) {
      expect(group.parallelSafe).toBe(true)
    }
    expect(result.independentUnits.length).toBe(3)
    expect(result.dependentUnits.length).toBe(0)
  })

  test("two units sharing a file are grouped as dependent", () => {
    const tool = createTaskSplitterTool()

    const result = tool.execute({
      units: [
        { name: "Unit 1: types", files: ["src/types.ts", "src/auth.ts"] },
        { name: "Unit 2: user", files: ["src/types.ts", "src/user.ts"] },
        { name: "Unit 3: docs", files: ["README.md"] },
      ],
    })

    expect(result.groups.length).toBe(2)

    const depGroup = result.groups.find(g => !g.parallelSafe)
    expect(depGroup).toBeTruthy()
    expect(depGroup!.units.sort()).toEqual(["Unit 1: types", "Unit 2: user"])
    expect(depGroup!.sharedFiles).toContain("src/types.ts")

    const indGroup = result.groups.find(g => g.parallelSafe)
    expect(indGroup!.units).toEqual(["Unit 3: docs"])

    expect(result.independentUnits).toEqual(["Unit 3: docs"])
    expect(result.dependentUnits.sort()).toEqual(["Unit 1: types", "Unit 2: user"])
  })

  test("three units all sharing files merge into one group", () => {
    const tool = createTaskSplitterTool()

    const result = tool.execute({
      units: [
        { name: "Unit 1", files: ["a.ts", "b.ts"] },
        { name: "Unit 2", files: ["b.ts", "c.ts"] },
        { name: "Unit 3", files: ["c.ts", "d.ts"] },
      ],
    })

    expect(result.groups.length).toBe(1)
    expect(result.groups[0].parallelSafe).toBe(false)
    expect(result.groups[0].units.sort()).toEqual(["Unit 1", "Unit 2", "Unit 3"])
    expect(result.independentUnits.length).toBe(0)
    expect(result.dependentUnits.length).toBe(3)
  })

  test("single unit is one parallel-safe group", () => {
    const tool = createTaskSplitterTool()

    const result = tool.execute({
      units: [
        { name: "Unit 1: solo", files: ["src/solo.ts"] },
      ],
    })

    expect(result.groups.length).toBe(1)
    expect(result.groups[0].parallelSafe).toBe(true)
    expect(result.groups[0].units).toEqual(["Unit 1: solo"])
    expect(result.independentUnits).toEqual(["Unit 1: solo"])
  })

  test("empty input returns empty output", () => {
    const tool = createTaskSplitterTool()

    const result = tool.execute({ units: [] })

    expect(result.groups).toEqual([])
    expect(result.independentUnits).toEqual([])
    expect(result.dependentUnits).toEqual([])
  })

  test("unit with no files is treated as independent", () => {
    const tool = createTaskSplitterTool()

    const result = tool.execute({
      units: [
        { name: "Unit 1: no files", files: [] },
        { name: "Unit 2: has files", files: ["src/main.ts"] },
      ],
    })

    expect(result.groups.length).toBe(2)
    expect(result.independentUnits.length).toBe(2)
    expect(result.dependentUnits.length).toBe(0)
  })
})

describe("brainstorm_dialog", () => {
  test("start creates a dialog with round 1", async () => {
    const repoRoot = `/tmp/pi-ce-bd-start-${Date.now()}`
    const tool = createBrainstormDialogTool()

    const result = await tool.execute({
      operation: "start",
      repoRoot,
      artifactPath: "docs/brainstorms/2026-04-18-auth-requirements.md",
      analysis: "Initial analysis: user authentication needed",
      questions: ["What auth provider?", "MFA required?"],
    })

    expect(result.round).toBe(1)
    expect(result.status).toBe("in_progress")
    expect(result.analysis).toBe("Initial analysis: user authentication needed")
    expect(result.openQuestions).toEqual(["What auth provider?", "MFA required?"])
  })

  test("refine increments round and incorporates responses", async () => {
    const repoRoot = `/tmp/pi-ce-bd-refine-${Date.now()}`
    const tool = createBrainstormDialogTool()

    await tool.execute({
      operation: "start",
      repoRoot,
      artifactPath: "docs/brainstorms/2026-04-18-auth-requirements.md",
      analysis: "Initial analysis",
      questions: ["What auth provider?"],
    })

    const result = await tool.execute({
      operation: "refine",
      repoRoot,
      artifactPath: "docs/brainstorms/2026-04-18-auth-requirements.md",
      analysis: "Refined analysis: OAuth2 with Google",
      questions: ["Session timeout preference?"],
      userResponses: ["Google OAuth2"],
    })

    expect(result.round).toBe(2)
    expect(result.status).toBe("in_progress")
    expect(result.analysis).toBe("Refined analysis: OAuth2 with Google")
    expect(result.openQuestions).toEqual(["Session timeout preference?"])
  })

  test("summarize marks dialog as complete", async () => {
    const repoRoot = `/tmp/pi-ce-bd-summarize-${Date.now()}`
    const tool = createBrainstormDialogTool()

    await tool.execute({
      operation: "start",
      repoRoot,
      artifactPath: "docs/brainstorms/2026-04-18-auth-requirements.md",
      analysis: "Initial",
      questions: ["Q1?"],
    })

    const result = await tool.execute({
      operation: "summarize",
      repoRoot,
      artifactPath: "docs/brainstorms/2026-04-18-auth-requirements.md",
      analysis: "Final: OAuth2 with Google, 30min timeout",
    })

    expect(result.round).toBe(1)
    expect(result.status).toBe("complete")
    expect(result.analysis).toBe("Final: OAuth2 with Google, 30min timeout")
    expect(result.openQuestions).toEqual([])
  })

  test("start on existing dialog returns current state", async () => {
    const repoRoot = `/tmp/pi-ce-bd-restart-${Date.now()}`
    const tool = createBrainstormDialogTool()

    await tool.execute({
      operation: "start",
      repoRoot,
      artifactPath: "docs/brainstorms/2026-04-18-auth-requirements.md",
      analysis: "Initial",
      questions: ["Q1?"],
    })

    await tool.execute({
      operation: "refine",
      repoRoot,
      artifactPath: "docs/brainstorms/2026-04-18-auth-requirements.md",
      analysis: "Refined",
      questions: ["Q2?"],
      userResponses: ["A1"],
    })

    const result = await tool.execute({
      operation: "start",
      repoRoot,
      artifactPath: "docs/brainstorms/2026-04-18-auth-requirements.md",
    })

    expect(result.round).toBe(2)
    expect(result.status).toBe("in_progress")
    expect(result.analysis).toBe("Refined")
  })

  test("rejects unknown operations", async () => {
    const tool = createBrainstormDialogTool()

    await expect(
      tool.execute({
        operation: "unknown" as any,
        repoRoot: "/tmp/test",
        artifactPath: "docs/test.md",
      }),
    ).rejects.toThrow("Unknown operation")
  })
})

describe("plan_diff", () => {
  const existingUnits = [
    { name: "Unit 1: auth", description: "Add auth module", files: ["src/auth.ts"] },
    { name: "Unit 2: user API", description: "Add user endpoints", files: ["src/user.ts"] },
    { name: "Unit 3: tests", description: "Write tests", files: ["tests/auth.test.ts"] },
  ]

  test("compare detects added, removed, modified, unchanged units", () => {
    const tool = createPlanDiffTool()

    const result = tool.execute({
      operation: "compare",
      existingUnits,
      newRequirements: [
        { name: "Unit 1: auth", description: "Add auth module with OAuth2", files: ["src/auth.ts", "src/oauth.ts"] },
        { name: "Unit 2: user API", description: "Add user endpoints", files: ["src/user.ts"] },
        { name: "Unit 4: docs", description: "Add API docs", files: ["docs/api.md"] },
      ],
    })

    if (result.operation !== "compare") throw new Error("Expected compare result")
    expect(result.added.length).toBe(1)
    expect(result.added[0].name).toBe("Unit 4: docs")
    expect(result.removed.length).toBe(1)
    expect(result.removed[0].name).toBe("Unit 3: tests")
    expect(result.modified.length).toBe(1)
    expect(result.modified[0].name).toBe("Unit 1: auth")
    expect(result.unchanged.length).toBe(1)
    expect(result.unchanged[0].name).toBe("Unit 2: user API")
  })

  test("compare with identical inputs returns all unchanged", () => {
    const tool = createPlanDiffTool()

    const result = tool.execute({
      operation: "compare",
      existingUnits,
      newRequirements: existingUnits,
    })

    if (result.operation !== "compare") throw new Error("Expected compare result")
    expect(result.added).toEqual([])
    expect(result.removed).toEqual([])
    expect(result.modified).toEqual([])
    expect(result.unchanged.length).toBe(3)
  })

  test("patch applies changes and returns merged result", () => {
    const tool = createPlanDiffTool()

    const result = tool.execute({
      operation: "patch",
      existingUnits,
      changes: [
        { action: "modify", name: "Unit 1: auth", description: "Add OAuth2", files: ["src/auth.ts", "src/oauth.ts"] },
        { action: "remove", name: "Unit 3: tests" },
        { action: "add", name: "Unit 4: docs", description: "API docs", files: ["docs/api.md"] },
      ],
    })

    if (result.operation !== "patch") throw new Error("Expected patch result")
    expect(result.units.length).toBe(3)
    const names = result.units.map((u: { name: string }) => u.name)
    expect(names).toContain("Unit 1: auth")
    expect(names).toContain("Unit 2: user API")
    expect(names).toContain("Unit 4: docs")
    expect(names).not.toContain("Unit 3: tests")
    expect(result.appliedChanges).toBe(3)
  })

  test("rejects unknown operations", () => {
    const tool = createPlanDiffTool()

    expect(() =>
      tool.execute({
        operation: "unknown" as any,
        existingUnits: [],
        newRequirements: [],
      }),
    ).toThrow("Unknown operation")
  })
})

describe("session_history", () => {
  const { _resetCounter } = require("../extensions/ce-core/tools/session-history")
  _resetCounter()

  test("record logs an execution and query returns it", async () => {
    const repoRoot = `/tmp/pi-ce-sh-record-${Date.now()}`
    const tool = createSessionHistoryTool()

    await tool.execute({
      operation: "record",
      repoRoot,
      skill: "ce-brainstorm",
      artifactPath: "docs/brainstorms/auth-requirements.md",
      summary: "Discovered auth requirements",
    })

    await tool.execute({
      operation: "record",
      repoRoot,
      skill: "ce-plan",
      artifactPath: "docs/plans/auth-plan.md",
      summary: "Created auth implementation plan",
    })

    await tool.execute({
      operation: "record",
      repoRoot,
      skill: "ce-brainstorm",
      artifactPath: "docs/brainstorms/payment-requirements.md",
      summary: "Discovered payment requirements",
    })

    const result = await tool.execute({
      operation: "query",
      repoRoot,
      skill: "ce-brainstorm",
    })

    expect(result.entries.length).toBe(2)
    expect(result.entries.every((e: { skill: string }) => e.skill === "ce-brainstorm")).toBe(true)
  })

  test("latest returns most recent per skill", async () => {
    const repoRoot = `/tmp/pi-ce-sh-latest-${Date.now()}`
    const tool = createSessionHistoryTool()

    await tool.execute({
      operation: "record",
      repoRoot,
      skill: "ce-work",
      artifactPath: "docs/plans/auth-plan.md",
      summary: "Executed unit 1",
    })

    await tool.execute({
      operation: "record",
      repoRoot,
      skill: "ce-work",
      artifactPath: "docs/plans/auth-plan.md",
      summary: "Executed unit 2",
    })

    const result = await tool.execute({
      operation: "latest",
      repoRoot,
    })

    expect(result.entries.length).toBe(1)
    expect(result.entries[0].skill).toBe("ce-work")
    expect(result.entries[0].summary).toBe("Executed unit 2")
  })

  test("query with no skill returns all entries", async () => {
    const repoRoot = `/tmp/pi-ce-sh-all-${Date.now()}`
    const tool = createSessionHistoryTool()

    await tool.execute({
      operation: "record",
      repoRoot,
      skill: "ce-brainstorm",
      artifactPath: "docs/brainstorms/a.md",
      summary: "Brainstorm A",
    })

    await tool.execute({
      operation: "record",
      repoRoot,
      skill: "ce-plan",
      artifactPath: "docs/plans/b.md",
      summary: "Plan B",
    })

    const result = await tool.execute({
      operation: "query",
      repoRoot,
    })

    expect(result.entries.length).toBe(2)
  })

  test("rejects unknown operations", async () => {
    const tool = createSessionHistoryTool()

    await expect(
      tool.execute({
        operation: "unknown" as any,
        repoRoot: "/tmp/test",
        skill: "ce-work",
      }),
    ).rejects.toThrow("Unknown operation")
  })
})

describe("pattern_extractor", () => {
  test("extract identifies recurring patterns from artifacts", () => {
    const tool = createPatternExtractorTool()

    const result = tool.execute({
      operation: "extract",
      artifacts: [
        { path: "docs/brainstorms/auth.md", content: "Use OAuth2 for authentication. Need token refresh." },
        { path: "docs/brainstorms/api.md", content: "Use OAuth2 for API auth. Token refresh needed." },
        { path: "docs/brainstorms/docs.md", content: "Add API documentation using markdown." },
      ],
      keywords: ["OAuth2", "token", "API"],
    })

    if (result.operation !== "extract") throw new Error("Expected extract result")
    expect(result.patterns.length).toBeGreaterThanOrEqual(1)
    const oauthPattern = result.patterns.find((p: { keyword: string }) => p.keyword === "OAuth2")
    expect(oauthPattern).toBeTruthy()
    expect(oauthPattern!.occurrences).toBe(2)
    expect(oauthPattern!.sources.length).toBe(2)
  })

  test("extract with no keywords extracts all word frequencies", () => {
    const tool = createPatternExtractorTool()

    const result = tool.execute({
      operation: "extract",
      artifacts: [
        { path: "a.md", content: "test test test unit test" },
      ],
    })

    if (result.operation !== "extract") throw new Error("Expected extract result")
    expect(result.patterns.length).toBeGreaterThan(0)
  })

  test("categorize groups patterns by type", () => {
    const tool = createPatternExtractorTool()

    const result = tool.execute({
      operation: "categorize",
      patterns: [
        { keyword: "OAuth2", occurrences: 3, sources: ["a.md", "b.md", "c.md"] },
        { keyword: "JWT", occurrences: 2, sources: ["a.md", "b.md"] },
        { keyword: "database", occurrences: 1, sources: ["c.md"] },
      ],
      categories: {
        "auth": ["OAuth2", "JWT", "token", "authentication"],
        "infra": ["database", "cache", "queue"],
      },
    })

    if (result.operation !== "categorize") throw new Error("Expected categorize result")
    expect(result.categories["auth"].length).toBe(2)
    expect(result.categories["infra"].length).toBe(1)
    expect(result.uncategorized.length).toBe(0)
  })

  test("categorize puts unmatched patterns in uncategorized", () => {
    const tool = createPatternExtractorTool()

    const result = tool.execute({
      operation: "categorize",
      patterns: [
        { keyword: "OAuth2", occurrences: 1, sources: ["a.md"] },
        { keyword: "unknown", occurrences: 1, sources: ["b.md"] },
      ],
      categories: {
        "auth": ["OAuth2"],
      },
    })

    if (result.operation !== "categorize") throw new Error("Expected categorize result")
    expect(result.categories["auth"].length).toBe(1)
    expect(result.uncategorized.length).toBe(1)
    expect(result.uncategorized[0].keyword).toBe("unknown")
  })

  test("rejects unknown operations", () => {
    const tool = createPatternExtractorTool()

    expect(() =>
      tool.execute({ operation: "unknown" as any, artifacts: [] }),
    ).toThrow("Unknown operation")
  })
})

describe("async_mutex", () => {
  test("serializes concurrent access", async () => {
    const { AsyncMutex } = require("../extensions/ce-core/tools/async-mutex")
    const mutex = new AsyncMutex()
    const order: string[] = []

    const task = async (label: string, delay: number) => {
      const release = await mutex.acquire()
      order.push(`${label}-start`)
      await new Promise(r => setTimeout(r, delay))
      order.push(`${label}-end`)
      release()
    }

    await Promise.all([task("A", 20), task("B", 10), task("C", 5)])

    // Each task must complete before the next starts
    expect(order).toEqual([
      "A-start", "A-end",
      "B-start", "B-end",
      "C-start", "C-end",
    ])
  })

  test("releases on error", async () => {
    const { AsyncMutex } = require("../extensions/ce-core/tools/async-mutex")
    const mutex = new AsyncMutex()

    const failing = async () => {
      const release = await mutex.acquire()
      try {
        throw new Error("boom")
      } finally {
        release()
      }
    }

    await expect(failing()).rejects.toThrow("boom")

    // Should still be able to acquire
    const release = await mutex.acquire()
    release()
  })
})

describe("parallel_subagent env isolation", () => {
  const originalDepth = process.env.PI_SUBAGENT_DEPTH
  const originalMax = process.env.PI_SUBAGENT_MAX_DEPTH

  const cleanup = () => {
    if (originalDepth === undefined) {
      delete process.env.PI_SUBAGENT_DEPTH
    } else {
      process.env.PI_SUBAGENT_DEPTH = originalDepth
    }
    if (originalMax === undefined) {
      delete process.env.PI_SUBAGENT_MAX_DEPTH
    } else {
      process.env.PI_SUBAGENT_MAX_DEPTH = originalMax
    }
  }

  test("env is clean after parallel execution", async () => {
    delete process.env.PI_SUBAGENT_DEPTH
    delete process.env.PI_SUBAGENT_MAX_DEPTH

    // Simulate the env-save/set/exec/restore pattern with a mutex
    const { AsyncMutex } = require("../extensions/ce-core/tools/async-mutex")
    const mutex = new AsyncMutex()

    const simulateRunner = async (_prompt: string, options?: import("../extensions/ce-core/tools/subagent").SubagentExecOptions) => {
      const extraEnv = options?.extraEnv ?? {}
      const release = await mutex.acquire()
      const saved: Record<string, string | undefined> = {}
      for (const [key, value] of Object.entries(extraEnv)) {
        saved[key] = process.env[key]
        process.env[key] = value
      }
      try {
        await new Promise(r => setTimeout(r, Math.random() * 10))
        return "ok"
      } finally {
        for (const [key, oldValue] of Object.entries(saved)) {
          if (oldValue === undefined) {
            delete process.env[key]
          } else {
            process.env[key] = oldValue
          }
        }
        release()
      }
    }

    const tool = createParallelSubagentTool()
    await tool.execute(
      { tasks: [
        { agent: "a", task: "t1" },
        { agent: "b", task: "t2" },
        { agent: "c", task: "t3" },
      ]},
      simulateRunner,
    )

    expect(process.env.PI_SUBAGENT_DEPTH).toBeUndefined()
    expect(process.env.PI_SUBAGENT_MAX_DEPTH).toBeUndefined()

    cleanup()
  })

  test("env is clean after serial chain execution", async () => {
    delete process.env.PI_SUBAGENT_DEPTH
    delete process.env.PI_SUBAGENT_MAX_DEPTH

    const { AsyncMutex } = require("../extensions/ce-core/tools/async-mutex")
    const mutex = new AsyncMutex()

    const simulateRunner = async (_prompt: string, options?: import("../extensions/ce-core/tools/subagent").SubagentExecOptions) => {
      const extraEnv = options?.extraEnv ?? {}
      const release = await mutex.acquire()
      const saved: Record<string, string | undefined> = {}
      for (const [key, value] of Object.entries(extraEnv)) {
        saved[key] = process.env[key]
        process.env[key] = value
      }
      try {
        await new Promise(r => setTimeout(r, 5))
        return "ok"
      } finally {
        for (const [key, oldValue] of Object.entries(saved)) {
          if (oldValue === undefined) {
            delete process.env[key]
          } else {
            process.env[key] = oldValue
          }
        }
        release()
      }
    }

    const tool = createSubagentTool()
    await tool.execute(
      { chain: [
        { agent: "a", task: "t1" },
        { agent: "b", task: "t2" },
      ]},
      simulateRunner,
    )

    expect(process.env.PI_SUBAGENT_DEPTH).toBeUndefined()
    expect(process.env.PI_SUBAGENT_MAX_DEPTH).toBeUndefined()

    cleanup()
  })
})

describe("ce-core extension runtime registration", () => {
  test("registers artifact_helper, ask_user_question, and subagent tools", () => {
    const registeredNames: string[] = []
    const eventHandlers = new Map<string, any[]>()
    const pi = {
      registerTool(definition: { name: string }) {
        registeredNames.push(definition.name)
      },
      on(event: string, handler: any) {
        const handlers = eventHandlers.get(event) ?? []
        handlers.push(handler)
        eventHandlers.set(event, handlers)
      },
      registerCommand(_name: string, _def: any) {
        // no-op for tests
      },
    }

    ceCoreExtension(pi as never)

    expect(registeredNames).toEqual([
      "artifact_helper",
      "ask_user_question",
      "ce_subagent",
      "workflow_state",
      "worktree_manager",
      "review_router",
      "ce_parallel_subagent",
      "session_checkpoint",
      "task_splitter",
      "brainstorm_dialog",
      "plan_diff",
      "session_history",
      "pattern_extractor",
      "context_handoff",
    ])
  })

  test("registers no bare subagent or parallel_subagent", () => {
    const registeredNames: string[] = []
    const pi = {
      registerTool(definition: { name: string }) {
        registeredNames.push(definition.name)
      },
      on(_event: string, _handler: any) {},
      registerCommand(_name: string, _def: any) {},
    }

    ceCoreExtension(pi as never)

    expect(registeredNames).not.toContain("subagent")
    expect(registeredNames).not.toContain("parallel_subagent")
  })

  test("brainstorm_dialog does not terminate the agent turn", async () => {
    const definitions = new Map<string, any>()
    const pi = {
      registerTool(definition: { name: string }) {
        definitions.set(definition.name, definition)
      },
      on(_event: string, _handler: any) {
        // no-op for tests
      },
      registerCommand(_name: string, _def: any) {
        // no-op for tests
      },
    }

    ceCoreExtension(pi as never)

    const brainstormDialog = definitions.get("brainstorm_dialog")
    const result = await brainstormDialog.execute("tool-call-id", {
      operation: "start",
      repoRoot: `/tmp/pi-ce-bd-runtime-${Date.now()}`,
      artifactPath: "docs/brainstorms/2026-04-24-runtime-requirements.md",
      analysis: "Initial analysis",
      questions: ["What exactly is broken?"],
    })

    expect(result.terminate).not.toBe(true)
    expect(result.details.openQuestions).toEqual(["What exactly is broken?"])
  })

  test("conversation-state tools do not terminate the agent turn", async () => {
    const definitions = new Map<string, any>()
    const pi = {
      registerTool(definition: { name: string }) {
        definitions.set(definition.name, definition)
      },
      on(_event: string, _handler: any) {
        // no-op for tests
      },
      registerCommand(_name: string, _def: any) {
        // no-op for tests
      },
    }

    ceCoreExtension(pi as never)

    const workflowState = definitions.get("workflow_state")
    const reviewRouter = definitions.get("review_router")
    const sessionCheckpoint = definitions.get("session_checkpoint")
    const sessionHistory = definitions.get("session_history")
    const patternExtractor = definitions.get("pattern_extractor")

    const workflowStateResult = await workflowState.execute("tool-call-id", {
      repoRoot: `/tmp/pi-ce-ws-runtime-${Date.now()}`,
    })
    expect(workflowStateResult.terminate).not.toBe(true)

    const reviewRouterResult = await reviewRouter.execute("tool-call-id", {
      filesChanged: ["src/auth.ts"],
      insertions: 10,
      deletions: 2,
    })
    expect(reviewRouterResult.terminate).not.toBe(true)

    const checkpointRepoRoot = `/tmp/pi-ce-checkpoint-runtime-${Date.now()}`
    const checkpointResult = await sessionCheckpoint.execute("tool-call-id", {
      operation: "load",
      repoRoot: checkpointRepoRoot,
      planPath: "docs/plans/demo-plan.md",
    })
    expect(checkpointResult.terminate).not.toBe(true)

    const historyRepoRoot = `/tmp/pi-ce-history-runtime-${Date.now()}`
    const historyResult = await sessionHistory.execute("tool-call-id", {
      operation: "query",
      repoRoot: historyRepoRoot,
    })
    expect(historyResult.terminate).not.toBe(true)

    const patternResult = await patternExtractor.execute("tool-call-id", {
      operation: "extract",
      artifacts: [{ path: "docs/a.md", content: "oauth token refresh oauth" }],
      keywords: ["oauth"],
    })
    expect(patternResult.terminate).not.toBe(true)
  })

  test("input hook switches model for stage skill commands using .pi/settings.json", async () => {
    const eventHandlers = new Map<string, any[]>()
    const setModelCalls: string[] = []
    const notifications: Array<{ message: string, level?: string }> = []
    const repoRoot = `/tmp/pi-ce-model-routing-${Date.now()}`
    await mkdir(path.join(repoRoot, ".pi"), { recursive: true })
    await writeFile(
      path.join(repoRoot, ".pi", "settings.json"),
      JSON.stringify({
        modelStrategy: {
          "02-plan": "anthropic/claude-opus-4-1",
          "03-work": "anthropic/claude-sonnet-4-20250514",
          default: "anthropic/claude-haiku-4-20250414",
        },
      }),
      "utf8",
    )

    const pi = {
      registerTool(_definition: { name: string }) {
        // no-op
      },
      on(event: string, handler: any) {
        const handlers = eventHandlers.get(event) ?? []
        handlers.push(handler)
        eventHandlers.set(event, handlers)
      },
      registerCommand(_name: string, _def: any) {
        // no-op
      },
      async setModel(model: { provider: string, id: string }) {
        setModelCalls.push(`${model.provider}/${model.id}`)
        return true
      },
    }

    ceCoreExtension(pi as never)

    const inputHandlers = eventHandlers.get("input") ?? []
    expect(inputHandlers.length).toBeGreaterThan(0)

    const result = await inputHandlers[0](
      { text: "/skill:02-plan docs/plans/demo-plan.md", source: "interactive" },
      {
        cwd: repoRoot,
        hasUI: true,
        model: { provider: "anthropic", id: "claude-sonnet-4-20250514" },
        modelRegistry: {
          find(provider: string, id: string) {
            return { provider, id }
          },
        },
        ui: {
          notify(message: string, level?: string) {
            notifications.push({ message, level })
          },
        },
      },
    )

    expect(result).toEqual({ action: "continue" })
    expect(setModelCalls).toEqual(["anthropic/claude-opus-4-1"])
    expect(notifications).toEqual([
      {
        message: "Switched model for 02-plan: anthropic/claude-opus-4-1",
        level: "info",
      },
    ])
  })

  test("input hook supports bare model ids by reusing the current provider", async () => {
    const eventHandlers = new Map<string, any[]>()
    const setModelCalls: string[] = []
    const repoRoot = `/tmp/pi-ce-model-routing-bare-${Date.now()}`
    await mkdir(path.join(repoRoot, ".pi"), { recursive: true })
    await writeFile(
      path.join(repoRoot, ".pi", "settings.json"),
      JSON.stringify({
        modelStrategy: {
          "03-work": "claude-opus-4-1",
        },
      }),
      "utf8",
    )

    const pi = {
      registerTool(_definition: { name: string }) {
        // no-op
      },
      on(event: string, handler: any) {
        const handlers = eventHandlers.get(event) ?? []
        handlers.push(handler)
        eventHandlers.set(event, handlers)
      },
      registerCommand(_name: string, _def: any) {
        // no-op
      },
      async setModel(model: { provider: string, id: string }) {
        setModelCalls.push(`${model.provider}/${model.id}`)
        return true
      },
    }

    ceCoreExtension(pi as never)

    const inputHandlers = eventHandlers.get("input") ?? []
    const result = await inputHandlers[0](
      { text: "/skill:03-work docs/plans/demo-plan.md", source: "interactive" },
      {
        cwd: repoRoot,
        hasUI: false,
        model: { provider: "anthropic", id: "claude-sonnet-4-20250514" },
        modelRegistry: {
          find(provider: string, id: string) {
            return { provider, id }
          },
        },
        ui: {
          notify() {
            // no-op
          },
        },
      },
    )

    expect(result).toEqual({ action: "continue" })
    expect(setModelCalls).toEqual(["anthropic/claude-opus-4-1"])
  })

  test("input hook switches thinking level through ExtensionAPI", async () => {
    const eventHandlers = new Map<string, any[]>()
    const thinkingCalls: string[] = []
    const notifications: Array<{ message: string, level?: string }> = []
    const repoRoot = `/tmp/pi-ce-thinking-routing-${Date.now()}`
    await mkdir(path.join(repoRoot, ".pi"), { recursive: true })
    await writeFile(
      path.join(repoRoot, ".pi", "settings.json"),
      JSON.stringify({
        thinkingStrategy: {
          "02-plan": "high",
        },
      }),
      "utf8",
    )

    const pi = {
      registerTool(_definition: { name: string }) {
        // no-op
      },
      on(event: string, handler: any) {
        const handlers = eventHandlers.get(event) ?? []
        handlers.push(handler)
        eventHandlers.set(event, handlers)
      },
      registerCommand(_name: string, _def: any) {
        // no-op
      },
      getThinkingLevel() {
        return "medium"
      },
      setThinkingLevel(level: string) {
        thinkingCalls.push(level)
      },
    }

    ceCoreExtension(pi as never)

    const inputHandlers = eventHandlers.get("input") ?? []
    const result = await inputHandlers[0](
      { text: "/skill:02-plan docs/plans/demo-plan.md", source: "interactive" },
      {
        cwd: repoRoot,
        hasUI: true,
        model: { provider: "anthropic", id: "claude-sonnet-4-20250514" },
        modelRegistry: {
          find(provider: string, id: string) {
            return { provider, id }
          },
        },
        ui: {
          notify(message: string, level?: string) {
            notifications.push({ message, level })
          },
        },
      },
    )

    expect(result).toEqual({ action: "continue" })
    expect(thinkingCalls).toEqual(["high"])
    expect(notifications).toEqual([
      {
        message: "Switched thinking level for 02-plan: high",
        level: "info",
      },
    ])
  })
  test("context_handoff wrapper passes structured runtime-memory fields through", async () => {
    const definitions = new Map<string, any>()
    const pi = {
      registerTool(definition: { name: string }) {
        definitions.set(definition.name, definition)
      },
      on(_event: string, _handler: any) {
        // no-op for tests
      },
      registerCommand(_name: string, _def: any) {
        // no-op for tests
      },
    }

    ceCoreExtension(pi as never)

    const contextHandoff = definitions.get("context_handoff")
    const repoRoot = `/tmp/pi-ce-handoff-wrapper-${Date.now()}`

    const result = await contextHandoff.execute("tool-call-id", {
      operation: "save",
      repoRoot,
      currentStage: "03-work",
      nextStage: "04-review",
      activeFiles: ["src/a.ts"],
      currentTruth: ["Fact A", "Fact B"],
      invalidatedAssumptions: ["Old assumption"],
      openDecisions: ["Decision X"],
      recentlyAccessedFiles: ["file1.ts"],
      compressionRisk: ["Risk Z"],
    })

    expect(result.details.currentTruth).toEqual(["Fact A", "Fact B"])
    expect(result.details.invalidatedAssumptions).toEqual(["Old assumption"])
    expect(result.details.openDecisions).toEqual(["Decision X"])
    expect(result.details.recentlyAccessedFiles).toEqual(["file1.ts"])
    expect(result.details.compressionRisk).toEqual(["Risk Z"])
  })

  test("context_handoff wrapper supports validate operation with probes and checks", async () => {
    const definitions = new Map<string, any>()
    const pi = {
      registerTool(definition: { name: string }) {
        definitions.set(definition.name, definition)
      },
      on(_event: string, _handler: any) {
        // no-op for tests
      },
      registerCommand(_name: string, _def: any) {
        // no-op for tests
      },
    }

    ceCoreExtension(pi as never)

    const contextHandoff = definitions.get("context_handoff")
    const repoRoot = `/tmp/pi-ce-handoff-validate-wrapper-${Date.now()}`

    // First save a handoff with recall + continuation evidence
    await contextHandoff.execute("tool-call-id", {
      operation: "save",
      repoRoot,
      currentStage: "02-plan",
      nextStage: "03-work",
      currentTruth: ["Fact A"],
      handoffMarkdown: "## Current Task\nTask.\n\n## Next Minimal Step\nDo it.\n",
    })

    // Now validate
    const result = await contextHandoff.execute("tool-call-id", {
      operation: "validate",
      repoRoot,
    })

    expect(result.details.operation).toBe("validate")
    expect(result.details.ok).toBe(true)
    expect(result.details.probes).toBeDefined()
    expect(result.details.probes.recall).toBe(true)
    expect(result.details.probes.continuation).toBe(true)
    expect(result.details.checks).toBeDefined()
    expect(result.details.checks.length).toBeGreaterThan(0)
    expect(result.details.recommendedAction).toBe("continue")
  })
})

describe("public exports", () => {
  test("only exports the extension default and public utility functions", async () => {
    const mod = await import("../extensions/ce-core/index")
    const exportNames = Object.keys(mod).filter(k => k !== "default")

    const expectedExports = [
      "createArtifactHelperTool",
      "createAskUserQuestionTool",
      "createSubagentTool",
      "createWorkflowStateTool",
      "createWorktreeManagerTool",
      "createReviewRouterTool",
      "createParallelSubagentTool",
      "createSessionCheckpointTool",
      "createTaskSplitterTool",
      "createBrainstormDialogTool",
      "createPlanDiffTool",
      "createSessionHistoryTool",
      "createPatternExtractorTool",
      "createContextHandoffTool",
      "getBrainstormArtifactPath",
      "getPlanArtifactPath",
      "getSolutionArtifactPath",
      "getRunArtifactPath",
      "normalizeSlug",
      "filterBashOutput",
      "filterReadOutput",
      "COMPACTION_FOCUS_INSTRUCTIONS",
      "checkSubagentDepth",
      "getChildDepthEnv",
      "DEFAULT_MAX_SUBAGENT_DEPTH",
      "AsyncMutex",
    ]

    expect(exportNames.sort()).toEqual(expectedExports.sort())
  })
})
