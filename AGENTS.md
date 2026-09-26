# Project Standards & Governance Rules

Whenever working on, editing, refactoring, or improving this project, document, or codebase, follow these rules strictly:

### 0. Zero-Regression & Protected Functionality Policy (MANDATORY CONTRACT)
* **Never introduce new bugs or break previously fixed functionality** whenever making a new change.
* **Stop the cycle of fixing, breaking, and re-fixing.** Every change must be additive, isolated, and safe.
* **Inspect before touching:** Before making any change, carefully inspect the existing implementation and understand how the proposed change may affect previously completed work.
* **Preserve all working functionality:** Do not modify, distort, or overwrite code that is unrelated to the current task.
* **Verify after every change:** After every fix or edit, verify that the fix works WITHOUT regressing or damaging anything that was already working.
* **Treat previously fixed functionality as strictly protected** unless the user explicitly asks to change it.
* **Work incrementally, carefully, and consistently**, rather than solving one problem while creating another.

### 1. File Management
* Keep only files that are necessary and useful to the current project.
* If we change the approach, structure, pattern, or implementation and an old file is no longer needed, remove/delete it.
* Do not leave obsolete, unused, duplicate, temporary, or outdated files in the project.
* Do not create unnecessary files when an existing file can be properly updated.
* Keep the project folder clean, organized, and easy to understand.

### 2. Safe Deletion Rule
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

### 3. Clean Code
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

### 4. Refactoring Rule
Whenever we replace or restructure an existing implementation:
* Identify what is being replaced.
* Find everywhere the old implementation is used.
* Update all affected references.
* Verify that the new implementation works.
* Remove the old implementation **only after confirming it is no longer required**.
* Remove related obsolete files or code only after applying the Safe Deletion Rule.
* Do not leave two implementations performing the same job unless both are intentionally required.

### 5. Final Project Cleanup
Before considering a task complete, review the project for:
* Unused files
* Duplicate files
* Dead code
* Unused imports
* Unused dependencies
* Duplicate functionality
* Broken imports or references
* Unnecessary configurations
* Outdated implementations
* Temporary files
* Unnecessary folders

For every item identified, determine whether it is actually safe to remove before deleting it.

### 6. Final Verification
Before finishing any task:
* Verify that required files still exist.
* Verify that imports and references are valid.
* Verify that no required functionality was accidentally removed.
* Run available tests, builds, type checks, or linting.
* Check for errors caused by the changes.
* Confirm that the final project structure is clean and logical.

### Core Rule
**Keep the project clean, but never clean it recklessly.**
Remove anything that is genuinely obsolete, unused, duplicated, or unnecessary **only after carefully verifying that it is safe to remove**.
If there is uncertainty, **keep the file/code and report it instead of deleting it**.
Always cross-check your work carefully. Accuracy and project stability are more important than aggressive cleanup.
