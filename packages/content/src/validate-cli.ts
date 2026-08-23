#!/usr/bin/env node
import { validateCatalog } from './validator.js';

const report = validateCatalog();

if (!report.valid) {
  console.error(`Content validation failed with ${report.issues.length} issue(s):`);
  for (const issue of report.issues)
    console.error(`- [${issue.code}] ${issue.path}: ${issue.message}`);
  process.exitCode = 1;
} else {
  const { counts } = report;
  console.log(
    [
      'Content validation passed.',
      `${counts.units} units + ${counts.draftLessons} draft-depth records`,
      `${counts.lessons} lessons`,
      `${counts.reviewedExercises}/${counts.exercises} reviewed exercises`,
      `${counts.glossaryTerms} glossary terms`,
      `${counts.nearMissAmbiguousLookalike} near-miss/ambiguous/lookalike`,
      `${counts.uncertaintyAnswers} uncertainty answers`,
      `${counts.riskOrPositionSize} risk/position-size`,
      `${counts.capstones} eleven-step capstone`,
      `categories=${JSON.stringify(counts.categories)}`,
    ].join(' | '),
  );
}
