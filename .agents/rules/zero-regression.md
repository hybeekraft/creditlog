# Strict Zero-Regression & Protected Functionality Policy

This rule is mandatory and must be strictly obeyed across all edits, refactors, and feature additions:

1. **Zero New Bugs & Zero Regressions:**
   - Stop introducing new bugs or breaking previously fixed functionality whenever making any change.
   - Stop the cycle of fixing one part while breaking another.

2. **Inspect Existing Implementation First:**
   - Before making any change, thoroughly inspect the existing code, dependencies, and state.
   - Understand how the proposed change affects previously completed and working features.

3. **Preserve All Working Functionality:**
   - Do not modify, remove, distort, or overwrite code that is unrelated to the current task.
   - Keep changes scoped, surgical, and minimal.

4. **Mandatory Post-Fix Verification:**
   - After every change or fix, test and verify that the target fix works AND that existing features remain fully intact.
   - Run tests, checks, or browser simulations to confirm no regressions occurred.

5. **Treat Completed Work as Protected:**
   - All previously fixed or working functionality is strictly protected.
   - Never alter protected behavior unless the user explicitly requests a change to that specific feature.

6. **Work Incrementally, Carefully, and Consistently:**
   - Make measured, atomic, and safe modifications.
   - Never solve one problem by introducing or risking another.
