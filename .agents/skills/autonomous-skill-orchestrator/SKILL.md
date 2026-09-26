---
name: autonomous-skill-orchestrator
description: Automatically analyzes every user request or project, identifies the installed skills and capabilities required, loads the relevant skill instructions, and orchestrates them throughout planning, implementation, testing, debugging, and completion. Use this skill whenever starting a new project, implementing a feature, fixing a bug, modifying an existing codebase, or performing any complex technical task.
---

# Autonomous Skill Orchestrator

## Purpose

Act as the skill-selection and orchestration layer for the coding agent.

For every user request, independently determine which installed skills are relevant and use them automatically. The user should not need to specify which skills to invoke.

The objective is:

> **User Request → Analyze → Discover Skills → Select Skills → Read Instructions → Plan → Execute → Verify → Iterate → Complete**

---

# 1. Analyze Every Request

Before implementing anything, determine:

* What the user actually wants.
* Whether this is a new project, existing project, feature, bug fix, refactor, deployment, testing, research, or maintenance task.
* Required technologies and frameworks.
* Required tools and external services.
* Expected output.
* Constraints and acceptance criteria.
* Potential dependencies.
* Potential security, performance, compatibility, or deployment concerns.

For simple requests, keep analysis lightweight.

For complex requests, break the task into logical subtasks.

---

# 2. Discover Available Skills

Inspect the installed/available skills before deciding how to execute a task.

Build an internal mapping:

```text
Task requirement
    ↓
Required capability
    ↓
Available skill
    ↓
Skill instructions
    ↓
Execution
```

Identify:

* Skills that are required.
* Skills that are strongly relevant.
* Skills that may become relevant during later stages.
* Skills that are irrelevant and should not be used.

Do not invoke skills merely because they exist.

---

# 3. Select Skills Automatically

Select skills based on the actual requirements of the task.

Examples:

```text
React project
→ frontend/UI skill

Node.js API
→ backend/API skill

PostgreSQL
→ database skill

Authentication
→ authentication/security skill

AWS deployment
→ AWS/cloud deployment skill

Docker
→ Docker/containerization skill

Testing
→ testing/QA skill

GitHub workflow
→ Git/GitHub skill
```

Multiple skills may be selected for a single task.

Determine their dependencies and execute them in a sensible order.

---

# 4. Read Selected Skill Instructions

Before using a selected skill:

1. Load its instructions.
2. Understand its workflow.
3. Identify required tools.
4. Identify constraints.
5. Follow its implementation methodology.

Never assume the contents of a skill.

Do not claim to have used a skill unless its instructions were actually loaded and followed.

---

# 5. Create a Skill Execution Map

For complex tasks, internally create a map such as:

```text
Project
├── Requirements
│   ├── Skill A
│   └── Skill B
│
├── Architecture
│   ├── Skill A
│   └── Skill C
│
├── Implementation
│   ├── Skill A
│   ├── Skill B
│   └── Skill D
│
├── Testing
│   └── Skill E
│
└── Deployment
    └── Skill F
```

Use the appropriate skill at the appropriate project stage.

---

# 6. Inspect Existing Projects

When working with an existing repository:

* Inspect the directory structure.
* Identify the technology stack.
* Read relevant configuration files.
* Inspect package/dependency files.
* Locate relevant source files.
* Understand existing architecture.
* Identify existing patterns and conventions.
* Check available scripts and commands.
* Inspect existing tests where relevant.

Do not rewrite working code unnecessarily.

Prefer extending the existing architecture.

---

# 7. Execute the Project

Use the selected skills to implement the requested work.

During implementation:

* Follow existing project conventions.
* Keep changes focused.
* Reuse existing functionality.
* Avoid unnecessary dependencies.
* Write maintainable code.
* Handle errors properly.
* Consider security.
* Consider performance.
* Preserve existing functionality.
* Keep the implementation consistent across the project.

---

# 8. Dynamically Re-Evaluate Skills

Skill selection must remain dynamic.

After each major stage, determine whether another skill is now required.

For example:

```text
Build application
        ↓
Authentication required
        ↓
Load authentication/security skill
        ↓
Database integration required
        ↓
Load database skill
        ↓
Deployment required
        ↓
Load cloud/deployment skill
```

Do not limit skill selection to the beginning of the project.

---

# 9. Error Handling

When something fails:

1. Inspect the error.
2. Determine its root cause.
3. Identify whether an installed skill is relevant.
4. Load the relevant skill if necessary.
5. Apply the recommended solution.
6. Test the fix.
7. Check for regressions.

Do not repeatedly apply guesses without understanding the underlying problem.

---

# 10. Verification

Never consider implementation complete merely because code has been written.

Where applicable, run:

* Unit tests.
* Integration tests.
* End-to-end tests.
* Type checking.
* Linting.
* Build commands.
* Application startup checks.
* API tests.
* Database checks.
* Deployment validation.

Use the project's existing validation commands whenever possible.

The standard loop is:

```text
IMPLEMENT
    ↓
TEST
    ↓
INSPECT
    ↓
FIX
    ↓
TEST AGAIN
```

Continue until the requested functionality is working or an external blocker prevents completion.

---

# 11. Security

When relevant, automatically consider:

* Authentication.
* Authorization.
* Input validation.
* SQL injection.
* XSS.
* CSRF.
* Secrets management.
* Environment variables.
* API security.
* Dependency vulnerabilities.
* Access control.
* Sensitive data exposure.
* Secure error handling.

Never expose credentials, API keys, passwords, tokens, or secrets.

---

# 12. Missing Skills

If a required capability does not exist:

1. Identify the missing capability.
2. Check whether another installed skill can reasonably perform the task.
3. Use the closest appropriate alternative.
4. Do not pretend that the missing skill was used.
5. Continue the implementation if possible.

If the missing capability makes completion impossible, clearly identify the blocker.

---

# 13. Avoid Unnecessary Work

Do not:

* Invoke every available skill.
* Read unrelated skills.
* Rewrite unrelated files.
* Add unnecessary dependencies.
* Change architecture without reason.
* Perform unnecessary refactoring.
* Repeat completed work.

Use the minimum set of skills necessary to achieve the requested result effectively.

---

# 14. Preserve Project Context

Throughout an ongoing project, maintain awareness of:

* Selected skills.
* Project architecture.
* Technology stack.
* Files changed.
* Previous implementation decisions.
* Known issues.
* Testing status.
* Deployment status.
* Outstanding requirements.

When a new request relates to an existing project, reuse this context instead of starting from scratch.

---

# 15. Completion Report

When the task is complete, provide a concise report:

```text
## Completed
- What was implemented.

## Skills Used
- Skill name — what it contributed.

## Files Changed
- Important files created or modified.

## Verification
- Tests/build/linting performed.
- Results.

## Remaining Issues
- Any unresolved issue or blocker.
```

Only report verification that was actually performed.

---

# Core Rule

**Never wait for the user to tell you which skill to use.**

For every request:

```text
ANALYZE
↓
DISCOVER
↓
SELECT
↓
READ
↓
PLAN
↓
INSPECT
↓
IMPLEMENT
↓
VERIFY
↓
ITERATE
↓
COMPLETE
```

The skill-selection process should be automatic, dynamic, and requirement-driven.

The goal is to make the coding agent capable of determining **what skills it needs, when it needs them, and how to combine them** without requiring manual skill selection from the user.
