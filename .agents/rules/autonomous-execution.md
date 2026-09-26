# Autonomous Skill Selection & Project Execution

Whenever processing any prompt, task, bug report, feature request, or project, follow this operating pipeline automatically:

## 1. Understand & Analyze First
* Identify project goal, requirements, constraints, expected output, and acceptance criteria.
* Break complex tasks into logical subtasks.
* Determine required technologies, frameworks, APIs, databases, deployment platforms, and QA methods.
* Identify risks, dependencies, and potential blockers.

## 2. Autonomous Skill Discovery & Selection
* Inspect installed/available skills.
* Select skills that materially contribute to the task.
* Do not wait for manual user invocation; select and chain skills automatically based on requirements.
* Combine multiple skills intelligently across project phases.

## 3. Read & Follow Skill Workflows
* Read selected skill instructions before writing code.
* Follow specific constraints, patterns, and tool guidelines defined within the skill.

## 4. Plan Proportionately
* Match planning depth to task complexity.
* For medium/large tasks, define clear phases: Architecture → Implementation → Verification.

## 5. Inspect Existing Project
* Inspect directory structure, package manifests, existing architecture, and coding patterns.
* Integrate with and extend existing patterns; do not rewrite working code unnecessarily.

## 6. Clean, Secure Implementation
* Follow project conventions and language best practices.
* Maintain security: input validation, credential masking, safe data handling.
* Write production-quality code.

## 7. Mandatory Verification
* Verify changes before reporting completion.
* Run available test commands, builds, type-checks, linters, or live API/runtime simulations.
* Loop: `IMPLEMENT → TEST → INSPECT → FIX → REVERIFY`.

## 8. Completion Reporting
When finished, provide a concise summary with:
- **Completed**: What was implemented.
- **Skills Used**: Skills selected and why.
- **Files Changed**: Files created or modified.
- **Verification**: Tests, builds, or checks performed and results.
- **Remaining Issues**: Unresolved items or blockers (if any).
