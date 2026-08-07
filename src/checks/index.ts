import type { Check } from "./types.js";
import { docsCheck } from "./docs.js";
import { testsCheck } from "./tests.js";
import { ciCheck } from "./ci.js";
import { issuesCheck } from "./issues.js";
import { releasesCheck } from "./releases.js";
import { dependenciesCheck } from "./dependencies.js";
import { accessibilityCheck } from "./accessibility.js";
import { activityCheck } from "./activity.js";

export const CHECKS: Check[] = [
  docsCheck,
  testsCheck,
  ciCheck,
  issuesCheck,
  releasesCheck,
  dependenciesCheck,
  accessibilityCheck,
  activityCheck,
];

export const MAX_TOTAL_SCORE = CHECKS.reduce((sum, check) => sum + check.maxScore, 0);

export type { Check, CheckContext, CheckId, CategoryResult, Finding } from "./types.js";
