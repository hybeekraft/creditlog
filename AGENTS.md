# Project Standards & Governance Rules

Whenever working on, editing, refactoring, or improving this project, document, or codebase, follow these rules strictly:

### 0. Clarify First: No Guessing & List Assumptions (MANDATORY CONTRACT)
* **Never guess what the user wants and run with it.**
* **List assumptions first:** State any assumptions explicitly before taking action.
* **Stop and ask when unclear:** If a requirement, scope, or edge case is ambiguous, stop and ask before starting, not after writing unnecessary code. Ask before starting, not after.

---

### 0.1. Zero-Regression & Protected Functionality Policy (MANDATORY CONTRACT)
* **Never introduce new bugs or break previously fixed functionality** whenever making a new change.
* **Stop the cycle of fixing, breaking, and re-fixing.** Every change must be additive, isolated, and safe.
* **Inspect before touching:** Before making any change, carefully inspect the existing implementation and understand how the proposed change may affect previously completed work.
* **Preserve all working functionality:** Do not modify, distort, or overwrite code that is unrelated to the current task.
* **Verify after every change:** After every fix or edit, verify that the fix works WITHOUT regressing or damaging anything that was already working.
* **Treat previously fixed functionality as strictly protected** unless the user explicitly asks to change it.
* **Work incrementally, carefully, and consistently**, rather than solving one problem while creating another.

---

### 0.2. Automatic Skill Selection & Application (MANDATORY CONTRACT)
Whenever processing any prompt, request, or starting a new project, first analyze the task and determine exactly which installed skills are relevant and necessary to complete it.
Automatically:
1. **Identify requirements and objectives** of the task or project.
2. **Review available installed skills.**
3. **Select only the skills** that are directly relevant to the task.
4. **Read selected skills** (`view_file` on `SKILL.md`) and follow their instructions.
5. **Apply those skills** throughout planning, development, implementation, testing, and completion where applicable.
6. **If multiple skills are needed**, combine and use them together in the appropriate order.
7. **Do not use irrelevant skills** or skip a relevant installed skill.
8. **If a required skill is not installed**, identify what capability is missing and proceed with the best available alternative when possible.
9. **For new projects**, continue using the selected skills throughout the project unless requirements change.
10. **Do not wait for explicit user instruction** on which skill to use; determine and execute this automatically from the request.

---

### 1. The Minimal Code Mandate: Write the Minimum (MANDATORY)
* **Write the minimum code needed:** Never write a thousand lines when a hundred will do. If 200 lines could be 50, rewrite them to 50.
* **Nothing unasked for:** Write nothing the user didn't ask for—no speculative features, unnecessary boilerplate, bloated abstractions, or unrequested architecture.
* **Surgical precision (Touch only the lines this needs):** Touch only the lines strictly required for the task. Never delete or mutate code you don't understand.

---

### 2. Reproduce Before Fixing (MANDATORY BUG-FIXING CONTRACT)
* **Never apply blind fixes:** Instead of jumping straight to "fix the bug", first write a test or minimal reproduction that reproduces the failure.
* **Make it pass with minimal code:** Once the reproduction demonstrates the bug, implement only the minimal changes necessary to make the test pass.
* **Verify against regressions:** Verify that the test passes and that no existing tests or behaviors regressed.

---

### 3. Humanized, Simple & Concise Code Comments (MANDATORY)
* **Simple, short, and straight to the point:** Write brief, clear comments that get straight to the message without unnecessary fluff.
* **Sound like a real human:** Write comments the way an experienced, sensible developer writes them. Avoid robotic, repetitive, academic, or over-engineered AI commentary.
* **Never state the obvious:** Do not write comments that merely repeat what the line of code already says (e.g., avoid `// set status to true` or `// initialize array`).
* **Focus on the "why":** Clarify tricky logic, edge cases, external API quirks, or non-obvious business requirements in plain, everyday language.
* **Keep code clean of comment clutter:** A few well-placed, humanized words are far more valuable than paragraphs of generated text.

---

### 4. File Management & Clean Repository
* Keep only files that are necessary and useful to the current project.
* If we change the approach, structure, pattern, or implementation and an old file is no longer needed, remove/delete it.
* Do not leave obsolete, unused, duplicate, temporary, or outdated files in the project.
* Do not create unnecessary files when an existing file can be properly updated.
* Keep the project folder clean, organized, and easy to understand.

---

### 5. Safe Deletion Rule
**Never delete a file, folder, code, dependency, database table, configuration, or other project resource based on assumption alone.**

Before deleting anything:
1. Check whether it is referenced anywhere in the project.
2. Check imports, exports, routes, API calls, components, services, scripts, configurations, environment settings, and build/deployment files.
3. Check whether it is used dynamically, indirectly, or through configuration.
4. Check whether another part of the application depends on it.
5. Confirm that its functionality has been completely replaced or is no longer required.
6. Check for tests, documentation, migrations, scripts, or other files that may depend on it.
7. Only delete it after confirming that removing it will not break the project.

**If you cannot confidently determine whether something is safe to delete, do NOT delete it. Keep it and flag it for review instead.**

After deletion:
* Re-check imports and references.
* Check for broken paths or missing dependencies.
* Run the relevant tests, build, type-check, lint, or application checks where available.
* Verify that the project still works as expected.

---

### 6. Clean Code & Refactoring
* Write clean, readable, maintainable, and production-ready code.
* Use meaningful names for variables, functions, classes, components, files, and folders.
* Avoid unnecessary complexity, repetition, and duplicated logic.
* Follow the conventions and best practices of the language and framework being used.
* Keep functions and components focused and reasonably small.
* Remove unused imports, variables, functions, components, dependencies, and dead code when it is safe to do so.
* Avoid unnecessary comments; comment only when additional context is genuinely useful.
* Do not introduce unnecessary abstractions, libraries, dependencies, or architecture.
* Reuse existing utilities and components when appropriate.
* Keep the code consistent with the existing project structure and coding style.
* Handle errors properly and do not hide potential problems.

---

### 7. Refactoring Rule
Whenever we replace or restructure an existing implementation:
* Identify what is being replaced.
* Find everywhere the old implementation is used.
* Update all affected references.
* Verify that the new implementation works.
* Remove the old implementation **only after confirming it is no longer required**.
* Remove related obsolete files or code only after applying the Safe Deletion Rule.
* Do not leave two implementations performing the same job unless both are intentionally required.

---

### 8. Final Project Cleanup & Verification
Before considering a task complete:
* Review the project for unused files, duplicate files, dead code, unused imports, and broken paths.
* Verify that required files still exist.
* Verify that imports and references are valid.
* Verify that no required functionality was accidentally removed.
* Run available tests, builds, type checks, or linting.
* Check for errors caused by the changes.
* Confirm that the final project structure is clean and logical.

---

### Core Rule
**Keep the project clean, but never clean it recklessly.**
Write the minimum, clarify assumptions upfront, touch only what is needed, and guarantee stability and zero regression.
