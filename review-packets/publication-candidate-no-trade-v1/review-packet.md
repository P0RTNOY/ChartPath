# חבילת ביקורת — publication-candidate-no-trade-v1

> חומר לביקורת אנושית בלבד. מועמד לפרסום אינו תרחיש מפורסם ואינו מעניק קרדיט.

## חוזה וזהות מדויקת

- Schema: `1`
- Contract: `review-packet-v1`
- Canonicalization: `canonical-json-v1`
- Candidate state: `publication-candidate`
- Candidate kind: `base-scenario`
- Correct decision kind: `no-trade`
- Scenario: `internal-no-trade-capstone-c@1.0.0`
- Dataset: `internal-no-trade-capstone-c-dataset@1.0.0`
- Dataset checksum: `sha256:c0b58867716179d9050c896988729457f3ddef8d083f4f103c3f7e7b49833aa2`
- Base scenario: `internal-no-trade-capstone-c@1.0.0`
- Base dataset: `internal-no-trade-capstone-c-dataset@1.0.0`
- Base dataset checksum: `sha256:c0b58867716179d9050c896988729457f3ddef8d083f4f103c3f7e7b49833aa2`
- Base material: `sha256:1ba1224283862c1a8799e23937294ef2e34c3a1ebd17018377a569205b3678c2`
- Position-management material: `לא חל`
- Material set: `sha256:cc42ef154e2740b8fcca6c88a88db04b15174843321ec6e3c10440129c017a72`
- Review packet: `sha256:0333ab31647a9255c0aae8a06026df8c2c76fd37d9095841081c5e7dc79c755a`

## נימוק בחירה

זהו המועמד היחיד שמחובר לרובריקת 11 שלבים שנבדקה עבור החלטת אי־עסקה מפורשת; הרווח העתידי אינו שיקול בבחירה.

## הידור, יצירה ונתוני מקור

- Scenario compiler: `scenario-compiler-v1`
- Compiler contract checksum: `sha256:92f6a21c940c781a62260d3983257b7ed0eb00a084617487d3b7aba7e7fffadd`
- Chart generator: `1.0.0`
- Generator seed: `53001`
- Chart-spec checksum: `sha256:8a39df10f87e41c5c2af04f965c87712dd753f834650ce61bfdc1bfeb647709b`

### Chart spec

```json
{
  "id": "internal-no-trade-capstone-c-chart-v1",
  "seed": 53001,
  "generatorVersion": "1.0.0",
  "candleCount": 96,
  "timeframe": "1h",
  "scenario": "ambiguous",
  "basePrice": 100,
  "baseVolume": 100000,
  "volatility": 0.012,
  "noise": 0.2,
  "decisionCandleIndex": 63,
  "parameters": {
    "direction": "down",
    "regime": "uptrend",
    "pattern": "head-and-shoulders",
    "eventIndex": 60
  }
}
```

### Dataset manifest

```json
{
  "datasetId": "internal-no-trade-capstone-c-dataset",
  "schemaVersion": 1,
  "datasetVersion": "1.0.0",
  "provenance": {
    "providerId": "chartpath-scenario-generator",
    "providerName": "ChartPath deterministic scenario generator",
    "origin": "chartpath-generated",
    "sourceUrl": "https://chartpath.invalid/internal/scenario-generator",
    "datasetOrEndpointId": "internal-no-trade-capstone-c-chart-v1@1.0.0",
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
      "Generated only for deterministic internal curriculum review."
    ]
  },
  "symbol": "CP-53001",
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
  "anonymizedLearnerIdentity": "blind-internal-no-trade-capstone-c",
  "rawChecksum": "sha256:bc929decb75eeaca3e9531d8a10edd15f1877d047634fa35cfcb41e550e2f899",
  "canonicalChecksum": "sha256:c0b58867716179d9050c896988729457f3ddef8d083f4f103c3f7e7b49833aa2",
  "startTimestampUtc": "2024-01-02T00:00:00.000Z",
  "endTimestampUtc": "2024-01-05T23:00:00.000Z",
  "candleCount": 96
}
```

### מתכון גזירת נרות עתידיים

_לא חל על מועמד זה._

## Replay, חיתוך ידע ועיוורון

- נר החלטה: `63`
- טווח גלוי התחלתי: `16–63`
- גבול Replay מורשה: `63`
- חיתוך ידע: `63`
- Blind: `true`
- Reveal: `after-finalization`

## חומר לומד בעברית ומבנה Guided Analysis

### מועמד אי־עסקה — מקרה ג׳

נתחו את מועמד אי־עסקה — מקרה ג׳ באמצעות 11 שלבי התהליך. אין להשתמש בנרות שמעבר לנקודת ההחלטה.

**סיכום ראיות עיוור:** בחלון הגלוי 16–63: טווח המחיר 96.2728–106.0593, סגירת נר ההחלטה 98.9797 ומחזור 99777.

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
  "kind": "no-trade",
  "disposition": "no-trade"
}
```

### רובריקת תהליך

```json
{
  "rubricId": "internal-no-trade-capstone-c-process-rubric",
  "rubricVersion": "1.0.0",
  "criteria": [
    {
      "workflowStepId": "context",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב context",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?"
    },
    {
      "workflowStepId": "structure",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב structure",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: איזה מבנה מחיר נתמך בראיות הגלויות בלבד?"
    },
    {
      "workflowStepId": "level",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב level",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: איזו רמה רלוונטית להחלטה ומדוע?"
    },
    {
      "workflowStepId": "setup",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב setup",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: האם תנאי התרחיש שהוגדר מראש קיים?"
    },
    {
      "workflowStepId": "confirmation",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב confirmation",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: איזה אישור נדרש, והאם הוא כבר הופיע?"
    },
    {
      "workflowStepId": "entry",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב entry",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?"
    },
    {
      "workflowStepId": "invalidation",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב invalidation",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: היכן הראיה המבנית נחשבת מבוטלת?"
    },
    {
      "workflowStepId": "position-size",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב position-size",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?"
    },
    {
      "workflowStepId": "target",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב target",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?"
    },
    {
      "workflowStepId": "management",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב management",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה."
    },
    {
      "workflowStepId": "review",
      "criterionHe": "מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב review",
      "expectedEvidenceHe": "מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?"
    }
  ],
  "expectedDecision": {
    "kind": "no-trade",
    "disposition": "no-trade"
  },
  "requiredRationaleReasonIds": [
    "reason-f353e054e229-a"
  ],
  "scoring": {
    "executionStatusAffectsScore": false,
    "profitAndLossAffectsScore": false
  },
  "checksum": "sha256:057229893cedc5bb5e75bbb650588842655800709fb34418e1c3951d90a03397"
}
```

## תכנית, סיכון וביצוע דטרמיניסטי

### תצורת Paper Execution

_לא חל על מועמד זה._

### תכנית Paper ראשונית — כניסה, סטופ, יעד וגודל

_לא חל על מועמד זה._

### אירועי ביצוע בסיסיים צפויים

_לא חל על מועמד זה._

## הרשאות ניהול, מקרי בדיקה ו־P&L

### פין חומר הניהול, מדיניות, הרשאות וגזירת dataset

_לא חל על מועמד זה._

### תצורת ניהול, מגבלות סיכון ופעולות מותרות

_לא חל על מועמד זה._

### מקרי ניהול, אירועים, עמימות ותוצאות צפויות

_לא חל על מועמד זה._

### ראיות עמימות

- אין.

- רווח/הפסד משפיע על הציון: `false`

## מקורות חינוכיים מדויקים וסיכומים מקוריים

### 1. base-scenario:internal-no-trade-capstone-c

- תפקיד: `base-scenario`
- מקור: `ta-he-v2`
- מסמך PDF: `ta-he-v2.pdf`
- checksum של מסמך המקור: `sha256:25554697f957169e5536da27a4441c97fea20a42a03efe54aa7113e5a8a25b33`
- עמודי PDF פיזיים: 74–75
- עמודים מודפסים: 61–62
- פרק: 19
- איור/מקרה: מקרה ג׳
- מזהי תוכן שנבדקו: `u10-capstone-e03`
- מושג נתמך: תבנית ברורה ללא יחס מתאים
- מצב זכויות PDF: `human-decision-required`

זהו המקור היחיד בקטלוג בעל רובריקת 11 שלבים מלאה והחלטת אי־עסקה מפורשת.

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

**חלופת תרשים:** גרף נרות סינתטי עיוור, נרות גלויים ⁦16⁩–⁦63⁩ בלבד. טווח גלוי ⁦96.2728⁩–⁦106.0593⁩. נר נבחר ⁦63⁩: פתיחה ⁦99.0087⁩, גבוה ⁦99.375⁩, נמוך ⁦98.6135⁩, סגירה ⁦98.9797⁩, מחזור ⁦99777⁩. אין בתיאור זה זהות נכס, תאריך נסתר, תשובה נכונה או נתון מנרות עתידיים.

### מחרוזות עבריות לביקורת

- איזה אישור נדרש, והאם הוא כבר הופיע?
- איזה מבנה מחיר נתמך בראיות הגלויות בלבד?
- איזו רמה רלוונטית להחלטה ומדוע?
- אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?
- בדקו אישור, ביטול ויחס תגמול־סיכון לפני החלטה.
- בחלון הגלוי 16–63: טווח המחיר 96.2728–106.0593, סגירת נר ההחלטה 98.9797 ומחזור 99777.
- בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה.
- גרף נרות סינתטי עיוור; תיאור המבנה והתוצאה אינם נחשפים לפני סיום הניתוח.
- האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?
- האם תנאי התרחיש שהוגדר מראש קיים?
- היכן הראיה המבנית נחשבת מבוטלת?
- הפרידו בין תיאור המבנה לבין החלטת היישום.
- התרחיש לימודי וסינתטי בלבד; הוא אינו המלצה אישית ואינו הוראת קנייה או מכירה.
- מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?
- מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?
- מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?
- מועמד אי־עסקה — מקרה ג׳
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: איזה אישור נדרש, והאם הוא כבר הופיע?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: איזה מבנה מחיר נתמך בראיות הגלויות בלבד?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: איזו רמה רלוונטית להחלטה ומדוע?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: אילו נתונים יתועדו לבדיקת איכות התהליך לאחר החשיפה?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: בחרו החלטה מפורשת: עסקה, המתנה או אי־עסקה.
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: האם ניתן לחשב גודל פוזיציה בלי לחרוג מתקציב הסיכון?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: האם תנאי התרחיש שהוגדר מראש קיים?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: היכן הראיה המבנית נחשבת מבוטלת?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: מהו ההקשר לפני נקודת ההחלטה, ומה אינו ידוע עדיין?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: מהו היעד התכנוני, ואיזו רמה עלולה להגביל אותו?
- מועמד אי־עסקה — מקרה ג׳ — תבנית ברורה ללא יחס מתאים: מהו תנאי הכניסה, אם קיימת עסקה קוהרנטית?
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב confirmation
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב context
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב entry
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב invalidation
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב level
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב management
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב position-size
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב review
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב setup
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב structure
- מועמד אי־עסקה — מקרה ג׳: נימוק מתועד ועקבי בשלב target
- נתחו את מועמד אי־עסקה — מקרה ג׳ באמצעות 11 שלבי התהליך. אין להשתמש בנרות שמעבר לנקודת ההחלטה.
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

### no-trade-decision-browser

- סוג: `browser-screenshot`
- מצב: `supporting-only`
- נתיב: `docs/screenshots/scenario-no-trade-decision-light-phone.png`
- checksum: `sha256:6d8a65193174848b73f2071f67ab68a875081cc00063feb92da565e03702aed0`
- גודל: 48295 bytes
- ממדים: 390×844
- תיאור: החלטת אי־עסקה בדפדפן עם ניסוח עברי מפורש.

### no-trade-debrief-browser

- סוג: `browser-screenshot`
- מצב: `supporting-only`
- נתיב: `docs/screenshots/scenario-no-trade-debrief-light-phone.png`
- checksum: `sha256:8146899b697dd8719019323d0c4eab4ce56e355999ccb2ec4380325ccab67e73`
- גודל: 57316 bytes
- ממדים: 390×844
- תיאור: תחקיר אי־עסקה בדפדפן; התוצאה אינה משנה את ציון התהליך.

## בדיקות אוטומטיות

- `packages/content/test/publication-candidates.test.ts`
- `packages/content/test/publication-attestations.test.ts`
- `packages/content/test/publication-preflight.test.ts`
- `packages/content/test/scenarios.test.ts`
- `packages/content/test/scenario-position-management.test.ts`

## hashes של כל רכיבי החומר שנבדקו

- `base-scenario-material`: `sha256:1ba1224283862c1a8799e23937294ef2e34c3a1ebd17018377a569205b3678c2`
- `chart-spec`: `sha256:8a39df10f87e41c5c2af04f965c87712dd753f834650ce61bfdc1bfeb647709b`
- `dataset-candles`: `sha256:c0b58867716179d9050c896988729457f3ddef8d083f4f103c3f7e7b49833aa2`
- `process-rubric`: `sha256:057229893cedc5bb5e75bbb650588842655800709fb34418e1c3951d90a03397`
- `scenario-compiler-contract`: `sha256:92f6a21c940c781a62260d3983257b7ed0eb00a084617487d3b7aba7e7fffadd`
- `source-provenance:base-scenario:internal-no-trade-capstone-c`: `sha256:542dd7fbd2ffd8bd09c1e8bf44e7334d8327bc6103aea414c665be6719e60c39`

## חסמים שנותרו

- inherited:02ca2acdc988f21b [external-evidence] — accessibility review is pending
- inherited:073579ccca435cda [external-evidence] — source review is pending
- inherited:11e3b48977c425d3 [external-evidence] — נדרש אישור אנושי מפורש לניסוח, לרובריקת 11 השלבים ולהתאמה למקור; לא בוצע אישור כזה.
- inherited:2f7966943036816e [external-evidence] — scenario-not-published: Publication gate requires published scenario status.
- inherited:367fb037f52be528 [external-evidence] — financial-safety review is pending
- inherited:89474533b6be2bb3 [external-evidence] — redistribution-not-verified: Verified use and redistribution rights are mandatory.
- inherited:b557a7fce4e1eb57 [external-evidence] — INTERNAL בלבד: נתוני ChartPath סינתטיים, ללא הרשאת הפצה לפרסום וללא קרדיט לימודי.
- inherited:b9d37bd74afeab64 [external-evidence] — human-editorial-review-required: Reviewed/published human editorial evidence is mandatory.
- inherited:f73bb43759a046e7 [external-evidence] — dataset-not-published: Publication gate rejects development/internal/unpublished datasets.
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
