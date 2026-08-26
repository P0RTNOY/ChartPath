# חבילת ביקורת — publication-candidate-long-v1

> חומר לביקורת אנושית בלבד. מועמד לפרסום אינו תרחיש מפורסם ואינו מעניק קרדיט.

## חוזה וזהות מדויקת

- Schema: `1`
- Contract: `review-packet-v1`
- Canonicalization: `canonical-json-v1`
- Candidate state: `publication-candidate`
- Candidate kind: `position-management`
- Correct decision kind: `long`
- Scenario: `internal-long-range-breakout@2.1.0`
- Dataset: `internal-long-range-breakout-dataset@2.0.0`
- Dataset checksum: `sha256:f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2`
- Base scenario: `internal-long-range-breakout@1.0.0`
- Base dataset: `internal-long-range-breakout-dataset@1.0.0`
- Base dataset checksum: `sha256:3119ca8967a40347d85d0c990ac9eea506402bee4b6d5414e93139768aecb2df`
- Base material: `sha256:aff491ab6a4c5a124b8d1a61657f74a0765b31e17c582cffad947d45b34b263c`
- Position-management material: `sha256:1f39e49342e080c9d9bbc9ebdd1b4884a2b5826e3c46507ed2ae4e83e53e15e0`
- Material set: `sha256:5212b1d0aab4eb6a1b6fd028a2a8f8d1d87551f7cf7530720c6fed65551a7b54`
- Review packet: `sha256:8d4578880f791c69acfc8ee39d2e98adf6880330a520438c60eee9522a93d159`

## נימוק בחירה

מקרה המקור השלם ביותר ללונג, עם נתוני עתיד נפרדים שמכסים עצירה שלילית ועמימות פתיחה בלי לבחור מסלול מיטיב.

## הידור, יצירה ונתוני מקור

- Scenario compiler: `scenario-compiler-v1`
- Compiler contract checksum: `sha256:92f6a21c940c781a62260d3983257b7ed0eb00a084617487d3b7aba7e7fffadd`
- Chart generator: `1.0.0`
- Generator seed: `51001`
- Chart-spec checksum: `sha256:4060fdc505536c0f6da062e64095215ed57689380de65bfaca47ea2510b6364b`

### Chart spec

```json
{
  "id": "internal-long-range-breakout-chart-v1",
  "seed": 51001,
  "generatorVersion": "1.0.0",
  "candleCount": 96,
  "timeframe": "1h",
  "scenario": "breakout",
  "basePrice": 100,
  "baseVolume": 100000,
  "volatility": 0.012,
  "noise": 0.2,
  "decisionCandleIndex": 63,
  "parameters": {
    "direction": "up",
    "regime": "range",
    "pattern": "rectangle",
    "eventIndex": 60
  }
}
```

### Dataset manifest

```json
{
  "datasetId": "internal-long-range-breakout-dataset",
  "schemaVersion": 1,
  "datasetVersion": "2.0.0",
  "provenance": {
    "providerId": "chartpath-scenario-generator",
    "providerName": "ChartPath deterministic scenario generator",
    "origin": "chartpath-generated",
    "sourceUrl": "https://chartpath.invalid/internal/scenario-generator",
    "datasetOrEndpointId": "internal-long-range-breakout-chart-v1@1.0.0:management:2.0.0",
    "retrievedAt": "2026-01-01T00:00:00.000Z",
    "termsUrl": "https://chartpath.invalid/internal/generated-data-terms",
    "license": {
      "licenseName": "ChartPath internal generated candidate data",
      "permittedUseStatus": "blocked",
      "redistributionStatus": "prohibited",
      "attributionRequirements": "ChartPath-generated synthetic data; never describe as market data.",
      "evidenceReviewedAt": "2026-01-01T00:00:00.000Z",
      "evidenceNotes": "Development candidate only; publication permission has not been reviewed or granted."
    },
    "knownLimitations": [
      "Synthetic prices are not observations of any security.",
      "Generated only for deterministic internal curriculum review.",
      "Future-only candles were deterministically replaced for internal position-management QA."
    ]
  },
  "symbol": "CP-51001",
  "displaySymbol": "נכס סינתטי",
  "exchange": "ChartPath generator",
  "currency": "XXX",
  "exchangeTimezone": "Asia/Jerusalem",
  "interval": {
    "unit": "hour",
    "value": 1,
    "milliseconds": 3600000
  },
  "pricePrecision": 4,
  "volumeUnit": "synthetic-units",
  "adjustment": {
    "mode": "raw",
    "splitPolicy": "unadjusted",
    "dividendPolicy": "unadjusted",
    "corporateActionPolicy": "explicit-actions-only"
  },
  "sessionPolicy": {
    "calendarId": "continuous-24x7",
    "includedSessions": [
      "continuous"
    ],
    "regularSessionOpen": "00:00",
    "regularSessionClose": "23:59",
    "timestampConvention": "start"
  },
  "missingIntervalPolicy": {
    "behavior": "record-and-preserve",
    "fillPolicy": "never-invent-candles",
    "declaredIrregularities": []
  },
  "publicationStatus": "internal",
  "anonymizedLearnerIdentity": "blind-internal-long-range-breakout",
  "rawChecksum": "sha256:cc858ee1a8bfee88101db747ca222f2e043fa52317968e7ffbf1c9badf414746",
  "canonicalChecksum": "sha256:f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2",
  "startTimestampUtc": "2024-01-02T00:00:00.000Z",
  "endTimestampUtc": "2024-01-05T23:00:00.000Z",
  "candleCount": 96
}
```

### מתכון גזירת נרות עתידיים

```json
{
  "schemaVersion": 1,
  "recipeVersion": "management-future-candle-replacement-v1",
  "lastPreservedCandleIndex": 64,
  "replacements": [
    {
      "candleIndex": 65,
      "open": 102,
      "high": 102.5,
      "low": 101.4,
      "close": 101.8
    }
  ],
  "recipeChecksum": "sha256:0649a41651d08b80b607d7d06639e10e962c749166c6022b26f2713a525018d6"
}
```

## Replay, חיתוך ידע ועיוורון

- נר החלטה: `63`
- טווח גלוי התחלתי: `16–63`
- גבול Replay מורשה: `63`
- חיתוך ידע: `63`
- Blind: `true`
- Reveal: `after-finalization`

## חומר לומד בעברית ומבנה Guided Analysis

### מועמד פריצה מטווח לניתוח לונג

נתחו את מועמד פריצה מטווח לניתוח לונג באמצעות 11 שלבי התהליך. אין להשתמש בנרות שמעבר לנקודת ההחלטה.

**סיכום ראיות עיוור:** בחלון הגלוי 16–63: טווח המחיר 97.6809–106.4795, סגירת נר ההחלטה 106.136 ומחזור 100694.

**שפת בטיחות פיננסית:** התרחיש לימודי וסינתטי בלבד; הוא אינו המלצה אישית ואינו הוראת קנייה או מכירה.

### רמזים

- הפרידו בין תיאור המבנה לבין החלטת היישום.
- בדקו אישור, ביטול ויחס תגמול־סיכון לפני החלטה.

### 11 שלבי התהליך / הנחיות עבודה

- `confirmation`: איזה אישור נדרש, והאם הוא כבר הופיע?
- `context`: מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?
- `entry`: מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?
- `invalidation`: היכן הראיה המבנית נחשבת מבוטלת?
- `level`: איזו רמה רלוונטית להחלטה ומדוע?
- `management`: בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה.
- `position-size`: האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?
- `review`: אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?
- `setup`: האם תנאי התרחיש שהוגדר מראש קיים?
- `structure`: איזה מבנה מחיר נתמך בראיות הגלויות בלבד?
- `target`: מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?

### Guided Analysis

- מופעל: `true`
- מספר רמזים זמין: `2`
- שומר על חיתוך ההחלטה: `true`

## תשובה נכונה ורובריקת תהליך — פרטי לסוקר

### החלטה נכונה ונימוק

```json
{
  "kind": "trade",
  "direction": "long"
}
```

### רובריקת תהליך

```json
{
  "rubricId": "internal-long-range-breakout-process-rubric",
  "rubricVersion": "1.0.0",
  "criteria": [
    {
      "workflowStepId": "context",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב context",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?"
    },
    {
      "workflowStepId": "structure",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב structure",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: איזה מבנה מחיר נתמך בראיות הגלויות בלבד?"
    },
    {
      "workflowStepId": "level",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב level",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: איזו רמה רלוונטית להחלטה ומדוע?"
    },
    {
      "workflowStepId": "setup",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב setup",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: האם תנאי התרחיש שהוגדר מראש קיים?"
    },
    {
      "workflowStepId": "confirmation",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב confirmation",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: איזה אישור נדרש, והאם הוא כבר הופיע?"
    },
    {
      "workflowStepId": "entry",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב entry",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?"
    },
    {
      "workflowStepId": "invalidation",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב invalidation",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: היכן הראיה המבנית נחשבת מבוטלת?"
    },
    {
      "workflowStepId": "position-size",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב position-size",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?"
    },
    {
      "workflowStepId": "target",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב target",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?"
    },
    {
      "workflowStepId": "management",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב management",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה."
    },
    {
      "workflowStepId": "review",
      "criterionHe": "מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב review",
      "expectedEvidenceHe": "מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?"
    }
  ],
  "expectedDecision": {
    "kind": "trade",
    "direction": "long"
  },
  "requiredRationaleReasonIds": [
    "reason-626fba5e303c-a"
  ],
  "scoring": {
    "executionStatusAffectsScore": false,
    "profitAndLossAffectsScore": false
  },
  "checksum": "sha256:530df8a6ba54f14f3abd5d82b0979677a41be82ce23a54e68963ef5a33a9127a"
}
```

## תכנית, סיכון וביצוע דטרמיניסטי

### תצורת Paper Execution

```json
{
  "enabled": true,
  "schemaVersion": 1,
  "mode": "aligned",
  "executionPolicyVersion": "paper-execution-policy-v1",
  "costModelVersion": "paper-cost-model-v1",
  "permittedDirections": [
    "long"
  ],
  "permittedEntryOrderTypes": [
    "market"
  ],
  "executionBoundary": {
    "afterDecisionCandleIndex": 63,
    "lastCandleIndex": 95
  },
  "learnerDisclosureHebrew": "סימולציית ביצוע לימודית בלבד; מילויים ועלויות נקבעים במדיניות דטרמיניסטית ואינם תחזית. התרחיש לימודי וסינתטי בלבד; הוא אינו המלצה אישית ואינו הוראת קנייה או מכירה.",
  "publicationStatus": "internal"
}
```

### תכנית Paper ראשונית — כניסה, סטופ, יעד וגודל

```json
{
  "planId": "internal-long-range-breakout-plan-v1",
  "direction": "long",
  "entryIntent": {
    "type": "market",
    "estimatedEntryPrice": 106.14
  },
  "protectiveStopPrice": 103,
  "targetPrice": 112,
  "fictionalAccountValue": 100000,
  "intendedRiskAmount": 1000,
  "quantity": 10,
  "authoredAtCandleIndex": 63,
  "processEvidence": {
    "analysisDecision": "long",
    "entryMatchesAnalysis": true,
    "invalidationMatchesAnalysis": true,
    "targetMatchesAnalysis": true,
    "requiredReasoningBypassed": false
  }
}
```

### אירועי ביצוע בסיסיים צפויים

```json
{
  "direction": "long",
  "entryOrderType": "market",
  "plan": {
    "planId": "internal-long-range-breakout-plan-v1",
    "direction": "long",
    "entryIntent": {
      "type": "market",
      "estimatedEntryPrice": 106.14
    },
    "protectiveStopPrice": 103,
    "targetPrice": 112,
    "fictionalAccountValue": 100000,
    "intendedRiskAmount": 1000,
    "quantity": 10,
    "authoredAtCandleIndex": 63,
    "processEvidence": {
      "analysisDecision": "long",
      "entryMatchesAnalysis": true,
      "invalidationMatchesAnalysis": true,
      "targetMatchesAnalysis": true,
      "requiredReasoningBypassed": false
    }
  },
  "expectedStatus": "closed",
  "requiredEvidence": [
    "market-entry",
    "target"
  ],
  "expectedSnapshot": {
    "schemaVersion": 1,
    "terminalStatus": "closed",
    "workingOrderStatus": "filled",
    "positionStatus": "closed-target",
    "events": [
      {
        "sequence": 0,
        "type": "session-created"
      },
      {
        "sequence": 1,
        "type": "order-submitted",
        "candleIndex": 63
      },
      {
        "sequence": 2,
        "type": "order-working",
        "candleIndex": 63
      },
      {
        "sequence": 3,
        "type": "order-filled",
        "candleIndex": 64,
        "fill": {
          "referencePrice": 106.1544,
          "price": 106.27,
          "commission": 1,
          "gap": false,
          "priceCappedByLimit": false
        }
      },
      {
        "sequence": 4,
        "type": "position-opened",
        "candleIndex": 64,
        "fill": {
          "referencePrice": 106.1544,
          "price": 106.27,
          "commission": 1,
          "gap": false,
          "priceCappedByLimit": false
        }
      },
      {
        "sequence": 5,
        "type": "position-closed-target",
        "candleIndex": 81,
        "fill": {
          "referencePrice": 112,
          "price": 112,
          "commission": 1,
          "gap": false,
          "priceCappedByLimit": true
        }
      }
    ],
    "debrief": {
      "outcome": "target",
      "outcomeDeterminate": true,
      "totalCommissions": 2,
      "modeledSpreadAndSlippage": 1.06,
      "netSimulatedOutcome": 55.3,
      "riskMultiple": 1.5533707865168538
    },
    "checksum": "sha256:aa8e83bb9018bafafebf928a10bcbafd114f6ab75d48a596b0d4a6e3b39ac1ad"
  }
}
```

## הרשאות ניהול, מקרי בדיקה ו־P&L

### פין חומר הניהול, מדיניות, הרשאות וגזירת dataset

```json
{
  "materialArtifactChecksum": "sha256:1f39e49342e080c9d9bbc9ebdd1b4884a2b5826e3c46507ed2ae4e83e53e15e0",
  "policyVersion": "position-management-policy-v1",
  "permissionVersion": "scenario-position-management-permission-v1-internal-long-range-breakout-2-1-0",
  "datasetDerivation": {
    "schemaVersion": 1,
    "recipeVersion": "management-future-candle-replacement-v1",
    "lastPreservedCandleIndex": 64,
    "replacements": [
      {
        "candleIndex": 65,
        "open": 102,
        "high": 102.5,
        "low": 101.4,
        "close": 101.8
      }
    ],
    "recipeChecksum": "sha256:0649a41651d08b80b607d7d06639e10e962c749166c6022b26f2713a525018d6"
  }
}
```

### תצורת ניהול, מגבלות סיכון ופעולות מותרות

```json
{
  "schemaVersion": 1,
  "enabled": true,
  "permissionVersion": "scenario-position-management-permission-v1-internal-long-range-breakout-2-1-0",
  "policy": {
    "version": "position-management-policy-v1",
    "actionTiming": "cutoff-n-eligible-n-plus-one",
    "replacementPriority": "activate-before-opening-thresholds",
    "voluntaryOpeningConflict": "pause-as-ambiguous",
    "intrabarThresholdConflict": "pause-as-ambiguous",
    "voluntaryFillPoint": "next-candle-open",
    "scaleInMaximumInitialQuantityBps": 10000,
    "softRiskLimitOriginalRBps": 10000,
    "hardRiskLimitOriginalRBps": 20000,
    "automaticTrailing": false
  },
  "riskLimits": {
    "maxOpenQuantityUnits": 20,
    "maxScaleInInitialQuantityBps": 10000,
    "softRiskLimitOriginalRBps": 10000,
    "hardRiskLimitOriginalRBps": 20000
  },
  "permittedActionKinds": [
    "full-exit",
    "partial-exit",
    "scale-in",
    "replace-stop",
    "replace-target"
  ],
  "rubric": {
    "rubricId": "internal-long-range-breakout-2-1-0-management-rubric",
    "rubricVersion": "1.0.0",
    "criteria": [
      {
        "criterionId": "management-plan-recorded-before-outcome",
        "basis": "reviewed-source",
        "criterionHe": "הנימוק והפעולה נרשמו לפני חשיפת הנר הבא.",
        "expectedEvidenceHe": "חותמת החיתוך קודמת לנר הזכאות, והיסטוריית היומן נשמרת.",
        "source": {
          "sourceId": "ta-he-v2",
          "pageStart": 76,
          "pageEnd": 79,
          "bookPageStart": 63,
          "bookPageEnd": 66,
          "chapter": "20 ודף העזר",
          "figureOrCase": "11 שלבי התהליך",
          "reviewedContentId": "u10-capstone-e05"
        }
      },
      {
        "criterionId": "management-risk-and-invalidation-recorded",
        "basis": "reviewed-source",
        "criterionHe": "הסיכון ונקודת ביטול התזה נבדקו לפני פעולת הניהול.",
        "expectedEvidenceHe": "הרשומה מציינת בדיקת סיכון וראיה גלויה, בלי להסתמך על התוצאה.",
        "source": {
          "sourceId": "ta-he-v2",
          "pageStart": 78,
          "pageEnd": 78,
          "bookPageStart": 65,
          "bookPageEnd": 65,
          "chapter": "דף עזר מהיר",
          "figureOrCase": "סטופ, גודל פוזיציה וניהול",
          "reviewedContentId": "u10-capstone-e05"
        }
      },
      {
        "criterionId": "management-simulator-assumptions-explicit",
        "basis": "neutral-simulator-mechanics",
        "criterionHe": "הפעולה הוערכה כמנגנון סימולטור ולא ככלל מסחר אוניברסלי.",
        "expectedEvidenceHe": "הרווח או ההפסד אינם משנים את ציון התהליך."
      }
    ],
    "scoring": {
      "profitAndLossAffectsScore": false,
      "futureOutcomeAffectsScore": false
    },
    "domainRubric": {
      "schemaVersion": 1,
      "criteria": [
        {
          "criterionId": "management-predefined-or-visible-evidence",
          "kind": "decision-basis",
          "accepted": [
            "predefined-plan",
            "new-visible-evidence",
            "risk-reduction"
          ]
        },
        {
          "criterionId": "management-risk-reviewed",
          "kind": "risk-reviewed",
          "required": true
        },
        {
          "criterionId": "management-evidence-recorded",
          "kind": "evidence-tags",
          "accepted": [
            "predefined-plan",
            "visible-price-evidence",
            "risk-budget",
            "uncertainty-recorded"
          ],
          "minimumMatches": 2
        },
        {
          "criterionId": "management-warning-acknowledged",
          "kind": "risk-warning-acknowledged",
          "required": true
        }
      ]
    },
    "checksum": "sha256:5e57d7d778cc91416f2137902e0921a0eaf97818bcdd33a6cd58ba5e443d7ee0"
  },
  "expectedCases": [
    {
      "caseId": "long-adverse-stop",
      "actions": [
        {
          "type": "process-only",
          "actionId": "long-adverse-stop-process-only",
          "processThroughCandleIndex": 65
        }
      ],
      "evidence": [
        "position-closed-stop"
      ],
      "snapshots": [
        {
          "schemaVersion": 1,
          "stageId": "handoff-open",
          "status": "active",
          "lastProcessedCandleIndex": 64,
          "openQuantityUnits": 10,
          "closedQuantityUnits": 0,
          "activeProtectiveStopMinor": 10300,
          "activeTargetMinor": 11200,
          "currentRiskMinor": 3580,
          "grossRealizedMinor": 0,
          "realizedNetMinor": 0,
          "totalCommissionMinor": 100,
          "totalModeledExecutionCostMinor": 106,
          "journalEntryCount": 0,
          "eventTypes": [
            "management-session-created"
          ],
          "checksum": "sha256:2b3c0b894156c5d43ba788f7f2489a33ade64591374a0227487bc2340c150ba0"
        },
        {
          "schemaVersion": 1,
          "stageId": "after-eligible-candles",
          "status": "closed-stop",
          "lastProcessedCandleIndex": 65,
          "openQuantityUnits": 0,
          "closedQuantityUnits": 10,
          "activeProtectiveStopMinor": 10300,
          "activeTargetMinor": 11200,
          "currentRiskMinor": 100,
          "grossRealizedMinor": -4380,
          "realizedNetMinor": -4580,
          "totalCommissionMinor": 200,
          "totalModeledExecutionCostMinor": 216,
          "journalEntryCount": 0,
          "eventTypes": [
            "management-session-created",
            "position-closed-stop"
          ],
          "debrief": {
            "outcome": "protective-stop",
            "outcomeDeterminate": true,
            "processQuality": "coherent",
            "realizedNetMinor": -4580,
            "materialActionCount": 0
          },
          "checksum": "sha256:dc3d2ef0a4b4800d7a307f99b5e435a3e8b62623683fa3082f2bf6d7a654de3d"
        }
      ]
    },
    {
      "caseId": "long-opening-ambiguity",
      "actions": [
        {
          "type": "material-intent",
          "actionId": "long-opening-ambiguity-material-intent",
          "authoredAtCandleIndex": 64,
          "intent": {
            "kind": "partial-exit",
            "quantityUnits": 4
          },
          "rationaleHe": "פעולת סימולטור מתועדת לפי הראיות הגלויות בלבד וללא שימוש בתוצאה עתידית.",
          "processEvidence": {
            "decisionBasis": "predefined-plan",
            "riskReviewed": true,
            "evidenceTags": [
              "predefined-plan",
              "risk-budget",
              "uncertainty-recorded"
            ]
          },
          "processThroughCandleIndex": 65
        }
      ],
      "evidence": [
        "management-action-submitted",
        "management-draft-edited",
        "partial-exit",
        "position-management-ambiguous",
        "voluntary-action-and-opening-threshold"
      ],
      "snapshots": [
        {
          "schemaVersion": 1,
          "stageId": "handoff-open",
          "status": "active",
          "lastProcessedCandleIndex": 64,
          "openQuantityUnits": 10,
          "closedQuantityUnits": 0,
          "activeProtectiveStopMinor": 10300,
          "activeTargetMinor": 11200,
          "currentRiskMinor": 3580,
          "grossRealizedMinor": 0,
          "realizedNetMinor": 0,
          "totalCommissionMinor": 100,
          "totalModeledExecutionCostMinor": 106,
          "journalEntryCount": 0,
          "eventTypes": [
            "management-session-created"
          ],
          "checksum": "sha256:2b3c0b894156c5d43ba788f7f2489a33ade64591374a0227487bc2340c150ba0"
        },
        {
          "schemaVersion": 1,
          "stageId": "action-pending",
          "status": "active",
          "lastProcessedCandleIndex": 64,
          "openQuantityUnits": 10,
          "closedQuantityUnits": 0,
          "activeProtectiveStopMinor": 10300,
          "activeTargetMinor": 11200,
          "currentRiskMinor": 3580,
          "grossRealizedMinor": 0,
          "realizedNetMinor": 0,
          "totalCommissionMinor": 100,
          "totalModeledExecutionCostMinor": 106,
          "journalEntryCount": 1,
          "eventTypes": [
            "management-session-created",
            "management-draft-edited",
            "management-action-submitted"
          ],
          "pendingActionKind": "partial-exit",
          "checksum": "sha256:5b49f8c70319f6825b3604084f4cc276b43799371e05dcc1f81382ebba8ffb10"
        },
        {
          "schemaVersion": 1,
          "stageId": "after-eligible-candles",
          "status": "ambiguous",
          "lastProcessedCandleIndex": 65,
          "openQuantityUnits": 10,
          "closedQuantityUnits": 0,
          "activeProtectiveStopMinor": 10300,
          "activeTargetMinor": 11200,
          "currentRiskMinor": 3580,
          "grossRealizedMinor": 0,
          "realizedNetMinor": 0,
          "totalCommissionMinor": 100,
          "totalModeledExecutionCostMinor": 106,
          "journalEntryCount": 1,
          "eventTypes": [
            "management-session-created",
            "management-draft-edited",
            "management-action-submitted",
            "position-management-ambiguous"
          ],
          "ambiguityReason": "voluntary-action-and-opening-threshold",
          "debrief": {
            "outcome": "ambiguous",
            "outcomeDeterminate": false,
            "processQuality": "coherent",
            "realizedNetMinor": 0,
            "materialActionCount": 1
          },
          "checksum": "sha256:0e4ba5a9748aa79f5f04062b54fb8ac76aca465171602a0144ae92d481eac0ae"
        }
      ]
    }
  ]
}
```

### מקרי ניהול, אירועים, עמימות ותוצאות צפויות

```json
[
  {
    "caseId": "long-adverse-stop",
    "actions": [
      {
        "type": "process-only",
        "actionId": "long-adverse-stop-process-only",
        "processThroughCandleIndex": 65
      }
    ],
    "evidence": [
      "position-closed-stop"
    ],
    "snapshots": [
      {
        "schemaVersion": 1,
        "stageId": "handoff-open",
        "status": "active",
        "lastProcessedCandleIndex": 64,
        "openQuantityUnits": 10,
        "closedQuantityUnits": 0,
        "activeProtectiveStopMinor": 10300,
        "activeTargetMinor": 11200,
        "currentRiskMinor": 3580,
        "grossRealizedMinor": 0,
        "realizedNetMinor": 0,
        "totalCommissionMinor": 100,
        "totalModeledExecutionCostMinor": 106,
        "journalEntryCount": 0,
        "eventTypes": [
          "management-session-created"
        ],
        "checksum": "sha256:2b3c0b894156c5d43ba788f7f2489a33ade64591374a0227487bc2340c150ba0"
      },
      {
        "schemaVersion": 1,
        "stageId": "after-eligible-candles",
        "status": "closed-stop",
        "lastProcessedCandleIndex": 65,
        "openQuantityUnits": 0,
        "closedQuantityUnits": 10,
        "activeProtectiveStopMinor": 10300,
        "activeTargetMinor": 11200,
        "currentRiskMinor": 100,
        "grossRealizedMinor": -4380,
        "realizedNetMinor": -4580,
        "totalCommissionMinor": 200,
        "totalModeledExecutionCostMinor": 216,
        "journalEntryCount": 0,
        "eventTypes": [
          "management-session-created",
          "position-closed-stop"
        ],
        "debrief": {
          "outcome": "protective-stop",
          "outcomeDeterminate": true,
          "processQuality": "coherent",
          "realizedNetMinor": -4580,
          "materialActionCount": 0
        },
        "checksum": "sha256:dc3d2ef0a4b4800d7a307f99b5e435a3e8b62623683fa3082f2bf6d7a654de3d"
      }
    ]
  },
  {
    "caseId": "long-opening-ambiguity",
    "actions": [
      {
        "type": "material-intent",
        "actionId": "long-opening-ambiguity-material-intent",
        "authoredAtCandleIndex": 64,
        "intent": {
          "kind": "partial-exit",
          "quantityUnits": 4
        },
        "rationaleHe": "פעולת סימולטור מתועדת לפי הראיות הגלויות בלבד וללא שימוש בתוצאה עתידית.",
        "processEvidence": {
          "decisionBasis": "predefined-plan",
          "riskReviewed": true,
          "evidenceTags": [
            "predefined-plan",
            "risk-budget",
            "uncertainty-recorded"
          ]
        },
        "processThroughCandleIndex": 65
      }
    ],
    "evidence": [
      "management-action-submitted",
      "management-draft-edited",
      "partial-exit",
      "position-management-ambiguous",
      "voluntary-action-and-opening-threshold"
    ],
    "snapshots": [
      {
        "schemaVersion": 1,
        "stageId": "handoff-open",
        "status": "active",
        "lastProcessedCandleIndex": 64,
        "openQuantityUnits": 10,
        "closedQuantityUnits": 0,
        "activeProtectiveStopMinor": 10300,
        "activeTargetMinor": 11200,
        "currentRiskMinor": 3580,
        "grossRealizedMinor": 0,
        "realizedNetMinor": 0,
        "totalCommissionMinor": 100,
        "totalModeledExecutionCostMinor": 106,
        "journalEntryCount": 0,
        "eventTypes": [
          "management-session-created"
        ],
        "checksum": "sha256:2b3c0b894156c5d43ba788f7f2489a33ade64591374a0227487bc2340c150ba0"
      },
      {
        "schemaVersion": 1,
        "stageId": "action-pending",
        "status": "active",
        "lastProcessedCandleIndex": 64,
        "openQuantityUnits": 10,
        "closedQuantityUnits": 0,
        "activeProtectiveStopMinor": 10300,
        "activeTargetMinor": 11200,
        "currentRiskMinor": 3580,
        "grossRealizedMinor": 0,
        "realizedNetMinor": 0,
        "totalCommissionMinor": 100,
        "totalModeledExecutionCostMinor": 106,
        "journalEntryCount": 1,
        "eventTypes": [
          "management-session-created",
          "management-draft-edited",
          "management-action-submitted"
        ],
        "pendingActionKind": "partial-exit",
        "checksum": "sha256:5b49f8c70319f6825b3604084f4cc276b43799371e05dcc1f81382ebba8ffb10"
      },
      {
        "schemaVersion": 1,
        "stageId": "after-eligible-candles",
        "status": "ambiguous",
        "lastProcessedCandleIndex": 65,
        "openQuantityUnits": 10,
        "closedQuantityUnits": 0,
        "activeProtectiveStopMinor": 10300,
        "activeTargetMinor": 11200,
        "currentRiskMinor": 3580,
        "grossRealizedMinor": 0,
        "realizedNetMinor": 0,
        "totalCommissionMinor": 100,
        "totalModeledExecutionCostMinor": 106,
        "journalEntryCount": 1,
        "eventTypes": [
          "management-session-created",
          "management-draft-edited",
          "management-action-submitted",
          "position-management-ambiguous"
        ],
        "ambiguityReason": "voluntary-action-and-opening-threshold",
        "debrief": {
          "outcome": "ambiguous",
          "outcomeDeterminate": false,
          "processQuality": "coherent",
          "realizedNetMinor": 0,
          "materialActionCount": 1
        },
        "checksum": "sha256:0e4ba5a9748aa79f5f04062b54fb8ac76aca465171602a0144ae92d481eac0ae"
      }
    ]
  }
]
```

### ראיות עמימות

- position-management-ambiguous

- רווח/הפסד משפיע על הציון: `false`

## מקורות חינוכיים מדויקים וסיכומים מקוריים

### 1. base-scenario:internal-long-range-breakout

- תפקיד: `base-scenario`
- מקור: `ta-he-v2`
- מסמך PDF: `ta-he-v2.pdf`
- checksum של מסמך המקור: `sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`
- עמודי PDF פיזיים: 72–73
- עמודים מודפסים: 59–60
- פרק: 19
- איור/מקרה: 19.1
- מזהי תוכן שנבדקו: `u10-capstone-e01`
- מושג נתמך: פריצה, תכנון סיכון ויעד
- מצב זכויות PDF: `human-decision-required`

המקרה מדגים מעבר מתנאי פריצה לתכנית סיכון שאינה מבטיחה תוצאה.

### 2. position-management-doctrine:management-plan-recorded-before-outcome

- תפקיד: `position-management-doctrine`
- מקור: `ta-he-v2`
- מסמך PDF: `ta-he-v2.pdf`
- checksum של מסמך המקור: `sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`
- עמודי PDF פיזיים: 76–79
- עמודים מודפסים: 63–66
- פרק: 20 ודף העזר
- איור/מקרה: 11 שלבי התהליך
- מזהי תוכן שנבדקו: `u10-capstone-e05`
- מושג נתמך: הנימוק והפעולה נרשמו לפני חשיפת הנר הבא.
- מצב זכויות PDF: `human-decision-required`

הנימוק והפעולה נרשמו לפני חשיפת הנר הבא. חותמת החיתוך קודמת לנר הזכאות, והיסטוריית היומן נשמרת.

### 3. position-management-doctrine:management-risk-and-invalidation-recorded

- תפקיד: `position-management-doctrine`
- מקור: `ta-he-v2`
- מסמך PDF: `ta-he-v2.pdf`
- checksum של מסמך המקור: `sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`
- עמודי PDF פיזיים: 78–78
- עמודים מודפסים: 65–65
- פרק: דף עזר מהיר
- איור/מקרה: סטופ, גודל פוזיציה וניהול
- מזהי תוכן שנבדקו: `u10-capstone-e05`
- מושג נתמך: הסיכון ונקודת ביטול התזה נבדקו לפני פעולת הניהול.
- מצב זכויות PDF: `human-decision-required`

הסיכון ונקודת ביטול התזה נבדקו לפני פעולת הניהול. הרשומה מציינת בדיקת סיכון וראיה גלויה, בלי להסתמך על התוצאה.

## זכויות ורישוי

- מקור dataset סינתטי: `chartpath-generated`
- גאומטריית תרשים הועתקה: `false`
- פרוזה הועתקה: `false`
- מצב זכויות נתונים שנוצרו: `human-decision-required`
- מצב זכויות עיבוד המקור: `human-decision-required`
- מצב הפצה מיועד: `not-authorized`
- מצב הפצה במניפסט: `prohibited`
- מצב פרסום במניפסט: `internal`

### שאלות רישוי פתוחות

- האם מותר להפיץ את העיבוד החינוכי המבוסס על מושגי המקור?
- מהו נוסח הרישיון והייחוס הנדרש לנתונים הסינתטיים?
- האם גרסת המועמד המדויקת מאושרת להפצה מחוץ לכלי QA פנימי?

## נגישות, עברית ואימות Native

- סדר קריאה: `rtl`
- כיוון מספרי: `ltr`
- שומר עיוורון: `true`
- מצב אימות Native: `open`

**הוראות אינטראקציה:** עברו לפי סדר 11 השלבים והסתמכו רק על הנרות שמספרם אינו גבוה מנקודת ההחלטה.

**חלופת תרשים:** גרף נרות סינתטי עיוור, נרות גלויים ⁦16⁩–⁦63⁩ בלבד. טווח גלוי ⁦97.6809⁩–⁦106.4795⁩. נר נבחר ⁦63⁩: פתיחה ⁦105.8825⁩, גבוה ⁦106.4795⁩, נמוך ⁦105.5398⁩, סגירה ⁦106.136⁩, מחזור ⁦100694⁩. אין בתיאור זה זהות נכס, תאריך נסתר, תשובה נכונה או נתון מנרות עתידיים.

### מחרוזות עבריות לביקורת

- איזה אישור נדרש, והאם הוא כבר הופיע?
- איזה מבנה מחיר נתמך בראיות הגלויות בלבד?
- איזו רמה רלוונטית להחלטה ומדוע?
- אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?
- בדקו אישור, ביטול ויחס תגמול־סיכון לפני החלטה.
- בחלון הגלוי 16–63: טווח המחיר 97.6809–106.4795, סגירת נר ההחלטה 106.136 ומחזור 100694.
- בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה.
- גרף נרות סינתטי עיוור; תיאור המבנה והתוצאה אינם נחשפים לפני סיום הניתוח.
- האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?
- האם תנאי התרחיש שהוגדר מראש קיים?
- היכן הראיה המבנית נחשבת מבוטלת?
- הנימוק והפעולה נרשמו לפני חשיפת הנר הבא.
- הסיכון ונקודת ביטול התזה נבדקו לפני פעולת הניהול.
- הפעולה הוערכה כמנגנון סימולטור ולא ככלל מסחר אוניברסלי.
- הפרידו בין תיאור המבנה לבין החלטת היישום.
- הרווח או ההפסד אינם משנים את ציון התהליך.
- הרשומה מציינת בדיקת סיכון וראיה גלויה, בלי להסתמך על התוצאה.
- התרחיש לימודי וסינתטי בלבד; הוא אינו המלצה אישית ואינו הוראת קנייה או מכירה.
- חותמת החיתוך קודמת לנר הזכאות, והיסטוריית היומן נשמרת.
- מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?
- מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?
- מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?
- מועמד פריצה מטווח לניתוח לונג
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: איזה אישור נדרש, והאם הוא כבר הופיע?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: איזה מבנה מחיר נתמך בראיות הגלויות בלבד?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: איזו רמה רלוונטית להחלטה ומדוע?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה.
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: האם תנאי התרחיש שהוגדר מראש קיים?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: היכן הראיה המבנית נחשבת מבוטלת?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?
- מועמד פריצה מטווח לניתוח לונג — פריצה, תכנון סיכון ויעד: מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב confirmation
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב context
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב entry
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב invalidation
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב level
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב management
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב position-size
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב review
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב setup
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב structure
- מועמד פריצה מטווח לניתוח לונג: נימוק מתועד ועקבי בשלב target
- נתחו את מועמד פריצה מטווח לניתוח לונג באמצעות 11 שלבי התהליך. אין להשתמש בנרות שמעבר לנקודת ההחלטה.
- עברו לפי סדר 11 השלבים והסתמכו רק על הנרות שמספרם אינו גבוה מנקודת ההחלטה.

## תחומי ביקורת נדרשים

- source
- rubric
- execution
- accessibility
- hebrew
- financial-safety
- licensing
- publication

## צילומי מסך וקובצי ראיות

### long-decision-browser

- סוג: `browser-screenshot`
- מצב: `supporting-only`
- נתיב: `docs/screenshots/m7-publication-candidate-long-decision-browser.png`
- checksum: `sha256:5775d8ed78649175991cf094c1758da49441f00cdcecbba9096e0eeff474a2c6`
- גודל: 62850 bytes
- ממדים: 390×844
- תיאור: מצב החלטת לונג בדפדפן; אינו אישור נגישות או בדיקת מכשיר מקורי.

### long-opening-ambiguity-browser

- סוג: `browser-screenshot`
- מצב: `supporting-only`
- נתיב: `docs/screenshots/position-management-ambiguity-light-phone.png`
- checksum: `sha256:5fde4d720360a2ae8483b30638b30589a039738a5408367e410f8fda1daf4e21`
- גודל: 57314 bytes
- ממדים: 390×844
- תיאור: עמימות ניהול מפורשת בדפדפן; אין הכרעת OHLCV מיטיבה.

## בדיקות אוטומטיות

- `packages/content/test/publication-candidates.test.ts`
- `packages/content/test/publication-attestations.test.ts`
- `packages/content/test/publication-preflight.test.ts`
- `packages/content/test/scenarios.test.ts`
- `packages/content/test/scenario-position-management.test.ts`

## hashes של כל רכיבי החומר שנבדקו

- `base-execution-snapshot`: `sha256:aa8e83bb9018bafafebf928a10bcbafd114f6ab75d48a596b0d4a6e3b39ac1ad`
- `base-scenario-material`: `sha256:aff491ab6a4c5a124b8d1a61657f74a0765b31e17c582cffad947d45b34b263c`
- `chart-spec`: `sha256:4060fdc505536c0f6da062e64095215ed57689380de65bfaca47ea2510b6364b`
- `dataset-candles`: `sha256:f927f4758ad81c6bdc1b2da7c5d4948af21ea930a0094db2ac9d49ee69e7f7d2`
- `management-snapshot:long-adverse-stop:0`: `sha256:2b3c0b894156c5d43ba788f7f2489a33ade64591374a0227487bc2340c150ba0`
- `management-snapshot:long-adverse-stop:1`: `sha256:dc3d2ef0a4b4800d7a307f99b5e435a3e8b62623683fa3082f2bf6d7a654de3d`
- `management-snapshot:long-opening-ambiguity:0`: `sha256:2b3c0b894156c5d43ba788f7f2489a33ade64591374a0227487bc2340c150ba0`
- `management-snapshot:long-opening-ambiguity:1`: `sha256:5b49f8c70319f6825b3604084f4cc276b43799371e05dcc1f81382ebba8ffb10`
- `management-snapshot:long-opening-ambiguity:2`: `sha256:0e4ba5a9748aa79f5f04062b54fb8ac76aca465171602a0144ae92d481eac0ae`
- `position-management-material`: `sha256:1f39e49342e080c9d9bbc9ebdd1b4884a2b5826e3c46507ed2ae4e83e53e15e0`
- `position-management-rubric`: `sha256:5e57d7d778cc91416f2137902e0921a0eaf97818bcdd33a6cd58ba5e443d7ee0`
- `process-rubric`: `sha256:530df8a6ba54f14f3abd5d82b0979677a41be82ce23a54e68963ef5a33a9127a`
- `scenario-compiler-contract`: `sha256:92f6a21c940c781a62260d3983257b7ed0eb00a084617487d3b7aba7e7fffadd`
- `source-provenance:base-scenario:internal-long-range-breakout`: `sha256:1995ca8df5746f2347100dfe675b4ee064ffebb279496b8869ea2c3fa25f814d`
- `source-provenance:position-management-doctrine:management-plan-recorded-before-outcome`: `sha256:ccce5bd7165d636caa098d5350b5cc21942b362773a501a4b73d73b66b078033`
- `source-provenance:position-management-doctrine:management-risk-and-invalidation-recorded`: `sha256:5a9505fc37392adb647d0466769b962e57c3387aa7adbe0f941ed87821f746cb`

## חסמים שנותרו

- inherited:01e62698f86e705d [external-evidence] — paper-execution-not-published: Paper execution must be independently published before the scenario can grant course credit.
- inherited:02ca2acdc988f21b [external-evidence] — accessibility review is pending
- inherited:073579ccca435cda [external-evidence] — source review is pending
- inherited:11e3b48977c425d3 [external-evidence] — נדרש אישור אנושי מפורש לניסוח, לרובריקת 11 השלבים ולהתאמה למקור; לא בוצע אישור כזה.
- inherited:143aa76902125b8b [external-evidence] — הרשאות, מקרי קצה ותצלומי מצב של ניהול דורשים ביקורת מקור, רובריקה, ביצוע, נגישות, עברית, בטיחות ופרסום.
- inherited:2f7966943036816e [external-evidence] — scenario-not-published: Publication gate requires published scenario status.
- inherited:367fb037f52be528 [external-evidence] — financial-safety review is pending
- inherited:89474533b6be2bb3 [external-evidence] — redistribution-not-verified: Verified use and redistribution rights are mandatory.
- inherited:b557a7fce4e1eb57 [external-evidence] — INTERNAL בלבד: נתוני ChartPath סינתטיים, ללא הרשאת הפצה לפרסום וללא קרדיט לימודי.
- inherited:b9d37bd74afeab64 [external-evidence] — human-editorial-review-required: Reviewed/published human editorial evidence is mandatory.
- inherited:f73bb43759a046e7 [external-evidence] — dataset-not-published: Publication gate rejects development/internal/unpublished datasets.
- inherited:fa22d2c4dc2370f0 [external-evidence] — ניהול פוזיציה הוא הרחבת QA סינתטית פנימית ללא ביקורת אנושית או קרדיט.
- inherited:fe3f592b998a84d0 [external-evidence] — hebrew review is pending
- licensing:redistribution-not-authorized [material-change] — החומר המקובע מגדיר הפצה כאסורה ופרסום כפנימי; נדרשת החלטת זכויות אנושית וגרסה בלתי־משתנה חדשה לפי הצורך.
- native:candidate-lifecycle-open [external-evidence] — מחזור חיים מקורי מלא, קורא מסך ומטריצת נגישות מערכת הפעלה טרם אומתו עבור המועמד המדויק.
- review-scope:accessibility [external-attestation] — נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום accessibility.
- review-scope:execution [external-attestation] — נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום execution.
- review-scope:financial-safety [external-attestation] — נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום financial-safety.
- review-scope:hebrew [external-attestation] — נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום hebrew.
- review-scope:licensing [external-attestation] — נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום licensing.
- review-scope:publication [external-attestation] — נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום publication.
- review-scope:rubric [external-attestation] — נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום rubric.
- review-scope:source [external-attestation] — נדרשת החלטת סוקר אנושי מאומתת ועדכנית בתחום source.

החבילה אינה כוללת תרשימי מקור, קטעי מקור ארוכים או קביעה משפטית.
