# חבילת ביקורת — publication-candidate-short-v1

> חומר לביקורת אנושית בלבד. מועמד לפרסום אינו תרחיש מפורסם ואינו מעניק קרדיט.

## חוזה וזהות מדויקת

- Schema: `1`
- Contract: `review-packet-v1`
- Canonicalization: `canonical-json-v1`
- Candidate state: `publication-candidate`
- Candidate kind: `position-management`
- Correct decision kind: `short`
- Scenario: `internal-short-double-top@2.0.0`
- Dataset: `internal-short-double-top-dataset@2.0.0`
- Dataset checksum: `sha256:357d1c59b511573583f40ee0ec332d737485fae2917ec3a3b7bec3564326967d`
- Base scenario: `internal-short-double-top@1.0.0`
- Base dataset: `internal-short-double-top-dataset@1.0.0`
- Base dataset checksum: `sha256:648d03368e3acfda4d459200ff9a5d4a7649dfc076cbfc1551b3394b8e0c6152`
- Base material: `sha256:b8b56eb342884a65fa9c7af96d27f67a248a87595debdef5193a425681a7328e`
- Position-management material: `sha256:8b63640cd86f6d6fab5da12170c2303a8c2b72756503bbae260ec2fba1c779bc`
- Material set: `sha256:15815a43ab08f9d3738331b00392ffe73afe62eb1ac481a53eb990001520ad6f`
- Review packet: `sha256:a81188ade007a1996bc7f080a26fad9c5174015b310f629e400eff18d769f404`

## נימוק בחירה

תרחיש שורט בעל מקור מדויק, אישור מבני והרשאת ניהול שנבחנת מול פער מאוחר תחת אותה מדיניות דטרמיניסטית.

## הידור, יצירה ונתוני מקור

- Scenario compiler: `scenario-compiler-v1`
- Compiler contract checksum: `sha256:92f6a21c940c781a62260d3983257b7ed0eb00a084617487d3b7aba7e7fffadd`
- Chart generator: `1.0.0`
- Generator seed: `52001`
- Chart-spec checksum: `sha256:92e911de01b1d84dfd0d7d4e29f9c18a6e34d8d7c19ac336b9ea579ad708b767`

### Chart spec

```json
{
  "id": "internal-short-double-top-chart-v1",
  "seed": 52001,
  "generatorVersion": "1.0.0",
  "candleCount": 96,
  "timeframe": "1h",
  "scenario": "reversal",
  "basePrice": 100,
  "baseVolume": 100000,
  "volatility": 0.012,
  "noise": 0.2,
  "decisionCandleIndex": 63,
  "parameters": {
    "direction": "down",
    "regime": "uptrend",
    "pattern": "double-top",
    "eventIndex": 60
  }
}
```

### Dataset manifest

```json
{
  "datasetId": "internal-short-double-top-dataset",
  "schemaVersion": 1,
  "datasetVersion": "2.0.0",
  "provenance": {
    "providerId": "chartpath-scenario-generator",
    "providerName": "ChartPath deterministic scenario generator",
    "origin": "chartpath-generated",
    "sourceUrl": "https://chartpath.invalid/internal/scenario-generator",
    "datasetOrEndpointId": "internal-short-double-top-chart-v1@1.0.0:management:2.0.0",
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
  "symbol": "CP-52001",
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
  "anonymizedLearnerIdentity": "blind-internal-short-double-top",
  "rawChecksum": "sha256:e134065664fb169d6c22947c32bee3afa9d25b0ced2998ee8604de4f4abb0f5b",
  "canonicalChecksum": "sha256:357d1c59b511573583f40ee0ec332d737485fae2917ec3a3b7bec3564326967d",
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
      "open": 94.2,
      "high": 95,
      "low": 93.6,
      "close": 94.4
    },
    {
      "candleIndex": 66,
      "open": 94.5,
      "high": 95.2,
      "low": 93.9,
      "close": 94.8
    },
    {
      "candleIndex": 67,
      "open": 98,
      "high": 99,
      "low": 97.5,
      "close": 98.5
    }
  ],
  "recipeChecksum": "sha256:b4184647a682e19418a1977c6c3dc1dbae7e662ed251253810f1dfcdb38d3ebb"
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

### מועמד פסגה כפולה לניתוח שורט

נתחו את מועמד פסגה כפולה לניתוח שורט באמצעות 11 שלבי התהליך. אין להשתמש בנרות שמעבר לנקודת ההחלטה.

**סיכום ראיות עיוור:** בחלון הגלוי 16–63: טווח המחיר 94.6786–103.9068, סגירת נר ההחלטה 94.9555 ומחזור 99279.

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
  "direction": "short"
}
```

### רובריקת תהליך

```json
{
  "rubricId": "internal-short-double-top-process-rubric",
  "rubricVersion": "1.0.0",
  "criteria": [
    {
      "workflowStepId": "context",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב context",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?"
    },
    {
      "workflowStepId": "structure",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב structure",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: איזה מבנה מחיר נתמך בראיות הגלויות בלבד?"
    },
    {
      "workflowStepId": "level",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב level",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: איזו רמה רלוונטית להחלטה ומדוע?"
    },
    {
      "workflowStepId": "setup",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב setup",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: האם תנאי התרחיש שהוגדר מראש קיים?"
    },
    {
      "workflowStepId": "confirmation",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב confirmation",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: איזה אישור נדרש, והאם הוא כבר הופיע?"
    },
    {
      "workflowStepId": "entry",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב entry",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?"
    },
    {
      "workflowStepId": "invalidation",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב invalidation",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: היכן הראיה המבנית נחשבת מבוטלת?"
    },
    {
      "workflowStepId": "position-size",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב position-size",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?"
    },
    {
      "workflowStepId": "target",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב target",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?"
    },
    {
      "workflowStepId": "management",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב management",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה."
    },
    {
      "workflowStepId": "review",
      "criterionHe": "מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב review",
      "expectedEvidenceHe": "מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?"
    }
  ],
  "expectedDecision": {
    "kind": "trade",
    "direction": "short"
  },
  "requiredRationaleReasonIds": [
    "reason-96fa35a11b8c-a"
  ],
  "scoring": {
    "executionStatusAffectsScore": false,
    "profitAndLossAffectsScore": false
  },
  "checksum": "sha256:bbcee3cfbdfc3b194bae8dd63b613f2fc47241346de1155b0289adff37781cb4"
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
    "short"
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
  "planId": "internal-short-double-top-plan-v1",
  "direction": "short",
  "entryIntent": {
    "type": "market",
    "estimatedEntryPrice": 94.96
  },
  "protectiveStopPrice": 97,
  "targetPrice": 88,
  "fictionalAccountValue": 100000,
  "intendedRiskAmount": 1000,
  "quantity": 10,
  "authoredAtCandleIndex": 63,
  "processEvidence": {
    "analysisDecision": "short",
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
  "direction": "short",
  "entryOrderType": "market",
  "plan": {
    "planId": "internal-short-double-top-plan-v1",
    "direction": "short",
    "entryIntent": {
      "type": "market",
      "estimatedEntryPrice": 94.96
    },
    "protectiveStopPrice": 97,
    "targetPrice": 88,
    "fictionalAccountValue": 100000,
    "intendedRiskAmount": 1000,
    "quantity": 10,
    "authoredAtCandleIndex": 63,
    "processEvidence": {
      "analysisDecision": "short",
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
          "referencePrice": 94.9734,
          "price": 94.87,
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
          "referencePrice": 94.9734,
          "price": 94.87,
          "commission": 1,
          "gap": false,
          "priceCappedByLimit": false
        }
      },
      {
        "sequence": 5,
        "type": "position-closed-target",
        "candleIndex": 83,
        "fill": {
          "referencePrice": 88,
          "price": 88,
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
      "modeledSpreadAndSlippage": 0.95,
      "netSimulatedOutcome": 66.7,
      "riskMultiple": 2.7336065573770494
    },
    "checksum": "sha256:164e047cea1f13ee8d4e374708c36bb36f652d85c67eff34ecdb34aec80e4682"
  }
}
```

## הרשאות ניהול, מקרי בדיקה ו־P&L

### פין חומר הניהול, מדיניות, הרשאות וגזירת dataset

```json
{
  "materialArtifactChecksum": "sha256:8b63640cd86f6d6fab5da12170c2303a8c2b72756503bbae260ec2fba1c779bc",
  "policyVersion": "position-management-policy-v1",
  "permissionVersion": "scenario-position-management-permission-v1-internal-short-double-top-2-0-0",
  "datasetDerivation": {
    "schemaVersion": 1,
    "recipeVersion": "management-future-candle-replacement-v1",
    "lastPreservedCandleIndex": 64,
    "replacements": [
      {
        "candleIndex": 65,
        "open": 94.2,
        "high": 95,
        "low": 93.6,
        "close": 94.4
      },
      {
        "candleIndex": 66,
        "open": 94.5,
        "high": 95.2,
        "low": 93.9,
        "close": 94.8
      },
      {
        "candleIndex": 67,
        "open": 98,
        "high": 99,
        "low": 97.5,
        "close": 98.5
      }
    ],
    "recipeChecksum": "sha256:b4184647a682e19418a1977c6c3dc1dbae7e662ed251253810f1dfcdb38d3ebb"
  }
}
```

### תצורת ניהול, מגבלות סיכון ופעולות מותרות

```json
{
  "schemaVersion": 1,
  "enabled": true,
  "permissionVersion": "scenario-position-management-permission-v1-internal-short-double-top-2-0-0",
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
    "rubricId": "internal-short-double-top-2-0-0-management-rubric",
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
      "caseId": "short-action-before-later-gap",
      "actions": [
        {
          "type": "material-intent",
          "actionId": "short-action-before-later-gap-material-intent",
          "authoredAtCandleIndex": 64,
          "intent": {
            "kind": "replace-stop",
            "price": 96
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
          "processThroughCandleIndex": 67
        }
      ],
      "evidence": [
        "management-action-submitted",
        "management-draft-edited",
        "position-closed-stop",
        "protective-stop-replaced",
        "replace-stop"
      ],
      "snapshots": [
        {
          "schemaVersion": 1,
          "stageId": "handoff-open",
          "status": "active",
          "lastProcessedCandleIndex": 64,
          "openQuantityUnits": 10,
          "closedQuantityUnits": 0,
          "activeProtectiveStopMinor": 9700,
          "activeTargetMinor": 8800,
          "currentRiskMinor": 2430,
          "grossRealizedMinor": 0,
          "realizedNetMinor": 0,
          "totalCommissionMinor": 100,
          "totalModeledExecutionCostMinor": 95,
          "journalEntryCount": 0,
          "eventTypes": [
            "management-session-created"
          ],
          "checksum": "sha256:e2b77b9cc34e8225840cacdc141c6dc8a349a29005163914ab5d15f7b751d4f7"
        },
        {
          "schemaVersion": 1,
          "stageId": "action-pending",
          "status": "active",
          "lastProcessedCandleIndex": 64,
          "openQuantityUnits": 10,
          "closedQuantityUnits": 0,
          "activeProtectiveStopMinor": 9700,
          "activeTargetMinor": 8800,
          "currentRiskMinor": 2430,
          "grossRealizedMinor": 0,
          "realizedNetMinor": 0,
          "totalCommissionMinor": 100,
          "totalModeledExecutionCostMinor": 95,
          "journalEntryCount": 1,
          "eventTypes": [
            "management-session-created",
            "management-draft-edited",
            "management-action-submitted"
          ],
          "pendingActionKind": "replace-stop",
          "checksum": "sha256:2e5a0775f42ed13871b547026e041a6fe1fd8b4af6ee88d59b30365d8c22043e"
        },
        {
          "schemaVersion": 1,
          "stageId": "after-eligible-candles",
          "status": "closed-stop",
          "lastProcessedCandleIndex": 67,
          "openQuantityUnits": 0,
          "closedQuantityUnits": 10,
          "activeProtectiveStopMinor": 9600,
          "activeTargetMinor": 8800,
          "currentRiskMinor": 100,
          "grossRealizedMinor": -3230,
          "realizedNetMinor": -3430,
          "totalCommissionMinor": 200,
          "totalModeledExecutionCostMinor": 195,
          "journalEntryCount": 1,
          "eventTypes": [
            "management-session-created",
            "management-draft-edited",
            "management-action-submitted",
            "protective-stop-replaced",
            "position-closed-stop"
          ],
          "debrief": {
            "outcome": "protective-stop",
            "outcomeDeterminate": true,
            "processQuality": "coherent",
            "realizedNetMinor": -3430,
            "materialActionCount": 1
          },
          "checksum": "sha256:50f5029575f695a837562ff43c887374793aaa81e6af12dddfb90b921ab09713"
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
    "caseId": "short-action-before-later-gap",
    "actions": [
      {
        "type": "material-intent",
        "actionId": "short-action-before-later-gap-material-intent",
        "authoredAtCandleIndex": 64,
        "intent": {
          "kind": "replace-stop",
          "price": 96
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
        "processThroughCandleIndex": 67
      }
    ],
    "evidence": [
      "management-action-submitted",
      "management-draft-edited",
      "position-closed-stop",
      "protective-stop-replaced",
      "replace-stop"
    ],
    "snapshots": [
      {
        "schemaVersion": 1,
        "stageId": "handoff-open",
        "status": "active",
        "lastProcessedCandleIndex": 64,
        "openQuantityUnits": 10,
        "closedQuantityUnits": 0,
        "activeProtectiveStopMinor": 9700,
        "activeTargetMinor": 8800,
        "currentRiskMinor": 2430,
        "grossRealizedMinor": 0,
        "realizedNetMinor": 0,
        "totalCommissionMinor": 100,
        "totalModeledExecutionCostMinor": 95,
        "journalEntryCount": 0,
        "eventTypes": [
          "management-session-created"
        ],
        "checksum": "sha256:e2b77b9cc34e8225840cacdc141c6dc8a349a29005163914ab5d15f7b751d4f7"
      },
      {
        "schemaVersion": 1,
        "stageId": "action-pending",
        "status": "active",
        "lastProcessedCandleIndex": 64,
        "openQuantityUnits": 10,
        "closedQuantityUnits": 0,
        "activeProtectiveStopMinor": 9700,
        "activeTargetMinor": 8800,
        "currentRiskMinor": 2430,
        "grossRealizedMinor": 0,
        "realizedNetMinor": 0,
        "totalCommissionMinor": 100,
        "totalModeledExecutionCostMinor": 95,
        "journalEntryCount": 1,
        "eventTypes": [
          "management-session-created",
          "management-draft-edited",
          "management-action-submitted"
        ],
        "pendingActionKind": "replace-stop",
        "checksum": "sha256:2e5a0775f42ed13871b547026e041a6fe1fd8b4af6ee88d59b30365d8c22043e"
      },
      {
        "schemaVersion": 1,
        "stageId": "after-eligible-candles",
        "status": "closed-stop",
        "lastProcessedCandleIndex": 67,
        "openQuantityUnits": 0,
        "closedQuantityUnits": 10,
        "activeProtectiveStopMinor": 9600,
        "activeTargetMinor": 8800,
        "currentRiskMinor": 100,
        "grossRealizedMinor": -3230,
        "realizedNetMinor": -3430,
        "totalCommissionMinor": 200,
        "totalModeledExecutionCostMinor": 195,
        "journalEntryCount": 1,
        "eventTypes": [
          "management-session-created",
          "management-draft-edited",
          "management-action-submitted",
          "protective-stop-replaced",
          "position-closed-stop"
        ],
        "debrief": {
          "outcome": "protective-stop",
          "outcomeDeterminate": true,
          "processQuality": "coherent",
          "realizedNetMinor": -3430,
          "materialActionCount": 1
        },
        "checksum": "sha256:50f5029575f695a837562ff43c887374793aaa81e6af12dddfb90b921ab09713"
      }
    ]
  }
]
```

### ראיות עמימות

- אין.

- רווח/הפסד משפיע על הציון: `false`

## מקורות חינוכיים מדויקים וסיכומים מקוריים

### 1. base-scenario:internal-short-double-top

- תפקיד: `base-scenario`
- מקור: `ta-he-v2`
- מסמך PDF: `ta-he-v2.pdf`
- checksum של מסמך המקור: `sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`
- עמודי PDF פיזיים: 41–41
- עמודים מודפסים: 28–28
- פרק: 9
- איור/מקרה: 9.1
- מזהי תוכן שנבדקו: `u05-reversal-e04`
- מושג נתמך: פסגה כפולה, שפל ביניים ואישור
- מצב זכויות PDF: `human-decision-required`

סגירה מתחת לשפל הביניים היא תנאי אישור ולא הוראת מסחר.

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

**חלופת תרשים:** גרף נרות סינתטי עיוור, נרות גלויים ⁦16⁩–⁦63⁩ בלבד. טווח גלוי ⁦94.6786⁩–⁦103.9068⁩. נר נבחר ⁦63⁩: פתיחה ⁦95.2694⁩, גבוה ⁦95.5472⁩, נמוך ⁦94.6786⁩, סגירה ⁦94.9555⁩, מחזור ⁦99279⁩. אין בתיאור זה זהות נכס, תאריך נסתר, תשובה נכונה או נתון מנרות עתידיים.

### מחרוזות עבריות לביקורת

- איזה אישור נדרש, והאם הוא כבר הופיע?
- איזה מבנה מחיר נתמך בראיות הגלויות בלבד?
- איזו רמה רלוונטית להחלטה ומדוע?
- אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?
- בדקו אישור, ביטול ויחס תגמול־סיכון לפני החלטה.
- בחלון הגלוי 16–63: טווח המחיר 94.6786–103.9068, סגירת נר ההחלטה 94.9555 ומחזור 99279.
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
- מועמד פסגה כפולה לניתוח שורט
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: איזה אישור נדרש, והאם הוא כבר הופיע?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: איזה מבנה מחיר נתמך בראיות הגלויות בלבד?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: איזו רמה רלוונטית להחלטה ומדוע?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה.
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: האם תנאי התרחיש שהוגדר מראש קיים?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: היכן הראיה המבנית נחשבת מבוטלת?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?
- מועמד פסגה כפולה לניתוח שורט — פסגה כפולה, שפל ביניים ואישור: מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב confirmation
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב context
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב entry
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב invalidation
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב level
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב management
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב position-size
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב review
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב setup
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב structure
- מועמד פסגה כפולה לניתוח שורט: נימוק מתועד ועקבי בשלב target
- נתחו את מועמד פסגה כפולה לניתוח שורט באמצעות 11 שלבי התהליך. אין להשתמש בנרות שמעבר לנקודת ההחלטה.
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

### short-decision-browser

- סוג: `browser-screenshot`
- מצב: `supporting-only`
- נתיב: `docs/screenshots/m7-publication-candidate-short-decision-browser.png`
- checksum: `sha256:df8d755868ca2ce9fccf5799238472ba697d67572e73a29808f85acfbe8c79bb`
- גודל: 72689 bytes
- ממדים: 430×932
- תיאור: מצב תרחיש שורט עיוור בדפדפן; אינו בדיקת TalkBack או מכשיר Android.

## בדיקות אוטומטיות

- `packages/content/test/publication-candidates.test.ts`
- `packages/content/test/publication-attestations.test.ts`
- `packages/content/test/publication-preflight.test.ts`
- `packages/content/test/scenarios.test.ts`
- `packages/content/test/scenario-position-management.test.ts`

## hashes של כל רכיבי החומר שנבדקו

- `base-execution-snapshot`: `sha256:164e047cea1f13ee8d4e374708c36bb36f652d85c67eff34ecdb34aec80e4682`
- `base-scenario-material`: `sha256:b8b56eb342884a65fa9c7af96d27f67a248a87595debdef5193a425681a7328e`
- `chart-spec`: `sha256:92e911de01b1d84dfd0d7d4e29f9c18a6e34d8d7c19ac336b9ea579ad708b767`
- `dataset-candles`: `sha256:357d1c59b511573583f40ee0ec332d737485fae2917ec3a3b7bec3564326967d`
- `management-snapshot:short-action-before-later-gap:0`: `sha256:e2b77b9cc34e8225840cacdc141c6dc8a349a29005163914ab5d15f7b751d4f7`
- `management-snapshot:short-action-before-later-gap:1`: `sha256:2e5a0775f42ed13871b547026e041a6fe1fd8b4af6ee88d59b30365d8c22043e`
- `management-snapshot:short-action-before-later-gap:2`: `sha256:50f5029575f695a837562ff43c887374793aaa81e6af12dddfb90b921ab09713`
- `position-management-material`: `sha256:8b63640cd86f6d6fab5da12170c2303a8c2b72756503bbae260ec2fba1c779bc`
- `position-management-rubric`: `sha256:5e57d7d778cc91416f2137902e0921a0eaf97818bcdd33a6cd58ba5e443d7ee0`
- `process-rubric`: `sha256:bbcee3cfbdfc3b194bae8dd63b613f2fc47241346de1155b0289adff37781cb4`
- `scenario-compiler-contract`: `sha256:92f6a21c940c781a62260d3983257b7ed0eb00a084617487d3b7aba7e7fffadd`
- `source-provenance:base-scenario:internal-short-double-top`: `sha256:b52705b316395b63f01d78d12a8caaa0ae0e8809c1d49c34841ae4b395454929`
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
