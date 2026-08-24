#!/usr/bin/env node
import { validateHistoricalContentRegistry } from './historical.js';
import { validateCatalog } from './validator.js';

const report = validateCatalog();
const historicalReport = validateHistoricalContentRegistry();

if (!report.valid || !historicalReport.valid) {
  const issueCount = report.issues.length + historicalReport.issues.length;
  console.error(`Content validation failed with ${issueCount} issue(s):`);
  for (const issue of report.issues)
    console.error(`- [${issue.code}] ${issue.path}: ${issue.message}`);
  for (const issue of historicalReport.issues)
    console.error(`- [${issue.code}] ${issue.path}: ${issue.message}`);
  process.exitCode = 1;
} else {
  const { counts } = report;
  const historicalCounts = historicalReport.counts;
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
      `${historicalCounts.datasets} historical dataset(s)`,
      `${historicalCounts.scenarios} historical scenario(s)`,
      `${historicalCounts.courseCreditEligible} course-credit eligible`,
      `${historicalCounts.publicationBlockers} explicit historical publication blocker(s)`,
    ].join(' | '),
  );
  for (const blocker of historicalReport.publicationBlockers)
    console.log(
      `Historical publication blocker [${blocker.code}] ${blocker.path}: ${blocker.message}`,
    );
}
