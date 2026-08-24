import { expect, type Page, test } from '@playwright/test';

async function beginFreshGuest(page: Page, dailyGoal = 10) {
  await page.goto('/');
  await expect(page.getByTestId('onboarding-screen')).toBeVisible();

  await page.getByRole('button', { name: 'המשך כאורח' }).click();
  await page
    .getByRole('checkbox', {
      name: 'קראתי והבנתי שהאפליקציה מיועדת ללימוד בלבד',
    })
    .click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await page.getByRole('radio', { name: `${dailyGoal} דקות ביום` }).click();
  await page.getByRole('button', { name: 'בנו לי מסלול' }).click();
  await expect(page.getByRole('heading', { name: 'המסלול שלי' })).toBeVisible();
}

async function answerExercise(page: Page, answers: readonly string[], nextLabel: string) {
  for (const answer of answers) {
    await page
      .getByRole('radio', { name: answer, exact: true })
      .or(page.getByRole('checkbox', { name: answer, exact: true }))
      .click();
  }
  await page.getByRole('button', { name: 'בדיקת התשובה' }).click();
  await expect(page.getByRole('heading', { name: 'הבחנה מדויקת' })).toBeVisible();
  await page.getByRole('button', { name: nextLabel }).click();
}

test('fresh Hebrew guest completes the first lesson and keeps progress after reload', async ({
  page,
}) => {
  await beginFreshGuest(page, 15);
  await page.goto('/learn/lesson-u01-chart-data');
  await expect(page.getByRole('heading', { name: 'השיעור עדיין נעול' })).toBeVisible();
  await expect(page.getByText(/מקמו על הנר העולה/)).toHaveCount(0);
  await page.goto('/home');
  await page.getByRole('button', { name: 'התחילו את השיעור' }).click();
  await expect(page.getByRole('heading', { name: 'תרחישים, לא נבואות' })).toBeVisible();
  await page.getByRole('button', { name: 'התחילו את השיעור' }).click();
  await expect(page.getByTestId('answer-basis')).toContainText('אין צורך להסיק מגרף');
  await expect(page.getByTestId('ohlcv-chart')).toHaveCount(0);

  await answerExercise(page, ['לתאר מבנה ותרחיש מותנה, בלי להבטיח כיוון או תוצאה.'], 'לתרגיל הבא');
  await answerExercise(
    page,
    ['הנר האחרון נסגר ב־102.4.', 'מחזור הנר היה 1.3 מיליון יחידות.', 'הטווח נמשך 18 נרות יומיים.'],
    'לתרגיל הבא',
  );
  await answerExercise(
    page,
    [
      'כל עוד נשמר אזור 98–100 ונוצר שפל גבוה, התרחיש החיובי נשאר אפשרי; סגירה מתחת ל־98 מבטלת אותו ומחזירה לבחינת תרחיש יורד.',
    ],
    'לתרגיל הבא',
  );
  await answerExercise(
    page,
    [
      'אין מספיק ראיות להעריך את הטענה בחלון ההחלטה.',
      'הבהירות נוצרה רק לאחר חשיפת התוצאה',
      'לא הוגדר כלל זיהוי ואישור מראש',
    ],
    'לתרגיל הבא',
  );
  await answerExercise(
    page,
    [
      'המקרה מיועד לתרגול תהליך, לא כהמלצה.',
      'קיימת אפשרות להפסד ולביצוע שונה מהמתוכנן.',
      'התנאי ונקודת הביטול נכתבו לפני חשיפת התוצאה.',
      'איכות התהליך נבדקה בנפרד מתוצאת המחיר.',
    ],
    'סיכום',
  );

  await expect(page.getByText('שיעור הושלם', { exact: true })).toBeVisible();
  await expect(page.getByText('5/5', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'חזרה למסלול' }).click();
  await page.waitForURL('**/home');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'המסלול שלי' })).toBeVisible();

  await page.goto('/lesson/lesson-u00-scenarios');
  await expect(page.getByRole('button', { name: 'תרגול מחדש' })).toBeVisible();

  await page.goto('/learn/lesson-u01-chart-data?exerciseId=u01-chart-data-e01');
  await expect(page.getByTestId('answer-basis')).toContainText('הגרף הוא חלק מהשאלה');
  await expect(page.getByTestId('ohlcv-chart')).toBeVisible();
});

test('glossary search and accessibility preferences work without an account', async ({ page }) => {
  await beginFreshGuest(page);

  await page.getByRole('tab', { name: 'מילון' }).click();
  const search = page.getByRole('textbox', { name: 'חיפוש במילון בעברית או באנגלית' });
  await search.fill('Breakout');
  await expect(page.getByText('פריצה', { exact: true }).first()).toBeVisible();

  await page.getByRole('tab', { name: 'הגדרות' }).click();
  await page.getByRole('radio', { name: 'כהה' }).click();
  await page.getByRole('radio', { name: 'גדול מאוד' }).click();
  await page.getByRole('switch', { name: 'הפחתת תנועה' }).click();

  await expect(page.getByRole('radio', { name: 'כהה' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'גדול מאוד' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'הפחתת תנועה' })).toBeChecked();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'כהה' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'גדול מאוד' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'הפחתת תנועה' })).toBeChecked();
});

test('learner completes a deterministic Chart Lab trendline analysis', async ({ page }) => {
  await beginFreshGuest(page);
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByRole('button', { name: 'פתיחת תרגול קו המגמה' }).click();

  await expect(page.getByTestId('chart-lab-screen')).toBeVisible();
  await expect(page.getByTestId('workbench-chart')).toBeVisible();
  await expect(page.getByTestId('workbench-chart-expected-line')).toHaveCount(0);

  await page.getByRole('button', { name: 'כלי קו מגמה' }).click();
  await page.getByRole('button', { name: 'סימון מדויק לפי נר ומחיר' }).click();
  await page.getByRole('textbox', { name: 'מספר הנר במעבדה' }).fill('21');
  await page.getByRole('textbox', { name: 'מחיר במעבדה' }).fill('105.938');
  await page.getByRole('button', { name: 'החלת הנר והמחיר' }).click();
  await expect(page.getByText('סמנו עוגן שני להשלמת קו המגמה.')).toBeVisible();

  await page.getByRole('button', { name: 'לחלון ההחלטה' }).click();
  await expect(page.getByText('72/72')).toBeVisible();
  await page.getByRole('textbox', { name: 'מספר הנר במעבדה' }).fill('56');
  await page.getByRole('textbox', { name: 'מחיר במעבדה' }).fill('115.0526');
  await page.getByRole('button', { name: 'החלת הנר והמחיר' }).click();

  await page.getByRole('button', { name: 'הגדלת הגרף' }).click();
  await page.getByRole('button', { name: 'השוואת הניתוח' }).click();
  await expect(page.getByTestId('workbench-feedback')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'סימון מדויק' })).toBeVisible();
  await expect(page.getByTestId('workbench-chart-expected-line')).toHaveCount(1);
});

async function submitGuidedSelections(page: Page, labels: readonly string[]) {
  for (const label of labels) {
    await page.getByRole('checkbox', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: /הגשת השלב/ }).click();
}

async function startGuidedAnalysis(page: Page) {
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await page.getByRole('button', { name: 'התחלת ניתוח חדש' }).click();
  await expect(page.getByTestId('guided-analysis-session')).toBeVisible();
}

async function startHistoricalAnalysis(page: Page) {
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  const historicalEntry = page.getByTestId('historical-replay-entry');
  await expect(historicalEntry).toBeVisible();
  await historicalEntry.getByRole('button').click();
  await expect(page.getByTestId('guided-analysis-session')).toBeVisible();
  await expect(page.getByTestId('historical-session-disclosure')).toBeVisible();
}

async function completeGuidedAnalysisFromLevel(page: Page) {
  await submitGuidedSelections(page, ['תמיכה שבועית 82.7', 'אזור קו צוואר 88']);
  await submitGuidedSelections(page, ['ראש וכתפיים אפשרי']);
  await submitGuidedSelections(page, ['סגירה יומית מתחת ל־88']);
  await submitGuidedSelections(page, ['טריגר כניסה תאורטי 87.8']);
  await submitGuidedSelections(page, ['ביטול תוקף מעל הכתף הימנית', 'הוראת עצירה אפשרית 98.6']);

  await page.getByRole('textbox', { name: 'סיכון חשבון' }).fill('600');
  await page.getByRole('textbox', { name: 'סיכון ליחידה' }).fill('11');
  await page.getByRole('textbox', { name: 'מספר יחידות' }).fill('54');
  await page.getByRole('button', { name: /הגשת השלב/ }).click();

  await page.getByRole('textbox', { name: 'מכפיל סיכון' }).fill('0.48');
  await page.getByRole('button', { name: /הגשת השלב/ }).click();

  await page.getByRole('radio', { name: 'אין עסקה ואין פוזיציה לניהול' }).click();
  await page.getByRole('checkbox', { name: 'לא נפתחה פוזיציה לאחר הפסילה' }).click();
  await page.getByRole('button', { name: /הגשת השלב/ }).click();

  await submitGuidedSelections(page, [
    'ההקשר נבדק לפני התבנית',
    'המכשול והיחס נבדקו מראש',
    'איכות התהליך נפרדת מן התוצאה',
  ]);
}

async function completeGuidedAnalysis(page: Page) {
  await submitGuidedSelections(page, ['המגמה השבועית עולה', 'הרעיון הוא מכירה בחסר נגד המגמה']);
  await submitGuidedSelections(page, ['מועמד לשלושה שיאים', 'שפל ביניים נצפה']);
  await completeGuidedAnalysisFromLevel(page);
}

async function persistedHistoricalSessionState(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('chartpath:guest-learning-data:v1');
    const parsed = JSON.parse(raw ?? '{}') as {
      analysisSessions?: readonly {
        sessionId?: string;
        status?: string;
        currentStepId?: string;
        revision?: number;
        chart?: { kind?: string };
        replay?: { cursorCandleIndex?: number; decisionCandleIndex?: number };
        steps?: Record<string, { status?: string; answer?: unknown }>;
        annotations?: readonly unknown[];
      }[];
    };
    const session = parsed.analysisSessions?.find(
      ({ chart, status }) => chart?.kind === 'historical' && status === 'active',
    );
    if (!session) return null;
    return {
      sessionId: session.sessionId,
      currentStepId: session.currentStepId,
      revision: session.revision,
      replay: session.replay,
      steps: session.steps,
      annotations: session.annotations,
    };
  });
}

async function persistedLearningCreditState(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('chartpath:guest-learning-data:v1');
    const parsed = JSON.parse(raw ?? '{}') as {
      attempts?: readonly unknown[];
      projections?: unknown;
    };
    return {
      attempts: parsed.attempts ?? [],
      projections: parsed.projections ?? null,
    };
  });
}

test('guided analysis resumes exact answers, replay, and learner annotations after leaving', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await beginFreshGuest(page);
  await startGuidedAnalysis(page);

  await submitGuidedSelections(page, ['המגמה השבועית עולה', 'הרעיון הוא מכירה בחסר נגד המגמה']);
  await submitGuidedSelections(page, ['מועמד לשלושה שיאים', 'שפל ביניים נצפה']);

  await page.getByRole('button', { name: 'כלי מחברת נקודה' }).click();
  await page.getByRole('button', { name: 'סימון מדויק לפי נר ומחיר' }).click();
  await page.getByRole('textbox', { name: 'מספר הנר במחברת' }).fill('12');
  await page.getByRole('textbox', { name: 'מחיר במחברת' }).fill('88');
  await page.getByRole('button', { name: 'החלת הנר והמחיר במחברת' }).click();
  await page.getByRole('button', { name: 'הנר הבא' }).click();
  await expect(page.getByText('נשמר במכשיר')).toBeVisible();

  await page.goto('/home');
  await expect(page.getByText('המשך מאותה טיוטה שמורה')).toBeVisible();
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await expect(page.getByTestId('analysis-resume-card')).toContainText('2/11');
  await page.getByRole('button', { name: 'המשך הניתוח' }).click();

  await expect(page.getByTestId('guided-analysis-session')).toContainText('2/11');
  await expect(page.getByRole('button', { name: /בחירת נקודה בנר/ })).toHaveCount(1);
  await expect(page.getByTestId('guided-analysis-session')).toContainText('25/60');
  await expect(page.getByRole('checkbox', { name: 'תמיכה שבועית 82.7', exact: true })).toHaveCount(
    1,
  );
});

test('guided analysis finalizes once, survives reload, and reopens read-only from history', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await beginFreshGuest(page);
  await startGuidedAnalysis(page);
  await completeGuidedAnalysis(page);

  const finalizeHeading = page.getByRole('heading', { name: /השלבים הוגשו/ });
  await finalizeHeading.scrollIntoViewIfNeeded();
  await expect(finalizeHeading).toBeVisible();
  await page.getByRole('button', { name: 'סיום מפורש של הניתוח' }).click();
  await page.getByRole('button', { name: 'אישור וסיום' }).click();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toBeVisible();
  await expect(page.getByText('ציון תהליך')).toBeVisible();

  const committed = await page.evaluate(() => {
    const raw = localStorage.getItem('chartpath:guest-learning-data:v1');
    const parsed = JSON.parse(raw ?? '{}') as {
      attempts?: readonly { attempt?: { exerciseId?: string } }[];
      projections?: { totalXp?: number };
      analysisSessions?: readonly { status?: string }[];
    };
    return {
      attempts: parsed.attempts?.filter(({ attempt }) => attempt?.exerciseId === 'u10-capstone-e03')
        .length,
      totalXp: parsed.projections?.totalXp,
      finalized: parsed.analysisSessions?.filter(({ status }) => status === 'finalized').length,
    };
  });
  expect(committed).toEqual({ attempts: 1, totalXp: 20, finalized: 1 });

  await page.reload();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toBeVisible();
  const afterReload = await page.evaluate(() => {
    const raw = localStorage.getItem('chartpath:guest-learning-data:v1');
    const parsed = JSON.parse(raw ?? '{}') as {
      attempts?: readonly { attempt?: { exerciseId?: string } }[];
      projections?: { totalXp?: number };
    };
    return {
      attempts: parsed.attempts?.filter(({ attempt }) => attempt?.exerciseId === 'u10-capstone-e03')
        .length,
      totalXp: parsed.projections?.totalXp,
    };
  });
  expect(afterReload).toEqual({ attempts: 1, totalXp: 20 });

  await page.getByRole('button', { name: 'היסטוריית ניתוחים' }).click();
  await expect(page.getByTestId('analysis-history-screen')).toBeVisible();
  await expect(page.getByTestId('analysis-history-finalized')).toContainText('סופי · קריאה בלבד');
  await page.getByRole('button', { name: 'פתיחת התחקיר' }).click();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toBeVisible();
  await expect(page.getByRole('button', { name: /הגשת השלב/ })).toHaveCount(0);
});

test('historical replay stays blind, resumes exactly, and finalizes once without learning credit', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await beginFreshGuest(page);
  const learningBefore = await persistedLearningCreditState(page);
  await startHistoricalAnalysis(page);

  const blindSession = page.getByTestId('guided-analysis-session');
  await expect(blindSession).toContainText('24/73');
  await expect(blindSession).toContainText('הזהות והתאריכים מוסתרים עד הסיום');
  await expect(blindSession).not.toContainText('Generated fixture 001');
  await expect(blindSession).not.toContainText('DEV-BLIND-001');
  await expect(blindSession).not.toContainText('2025-01-05');
  await expect(blindSession).not.toContainText('2025-01-09');
  await expect(page.getByTestId('historical-replay-reveal')).toHaveCount(0);

  await page.getByRole('button', { name: 'הנר הבא' }).click();
  await expect(blindSession).toContainText('25/73');
  await submitGuidedSelections(page, ['המגמה השבועית עולה', 'הרעיון הוא מכירה בחסר נגד המגמה']);
  await submitGuidedSelections(page, ['מועמד לשלושה שיאים', 'שפל ביניים נצפה']);
  await expect(page.getByText('נשמר במכשיר')).toBeVisible();
  const beforeLeaving = await persistedHistoricalSessionState(page);
  expect(beforeLeaving).not.toBeNull();

  await page.goto('/home');
  await page.getByRole('button', { name: 'פתיחת מעבדת הגרפים' }).click();
  await expect(page.getByTestId('historical-analysis-resume-card')).toContainText('2/11');
  await expect(page.getByTestId('historical-analysis-resume-card')).toContainText('cursor 25');
  await page.getByTestId('historical-analysis-resume-card').getByRole('button').first().click();
  await expect(page.getByTestId('guided-analysis-session')).toContainText('25/73');
  expect(await persistedHistoricalSessionState(page)).toEqual(beforeLeaving);
  await expect(page.getByRole('checkbox', { name: 'תמיכה שבועית 82.7', exact: true })).toHaveCount(
    1,
  );

  await page.getByRole('button', { name: 'לנקודת ההחלטה' }).click();
  await expect(page.getByTestId('guided-analysis-session')).toContainText('73/73');
  await completeGuidedAnalysisFromLevel(page);
  await expect(page.getByRole('heading', { name: /השלבים הוגשו/ })).toBeVisible();

  await page.getByRole('button', { name: 'סיום מפורש של הניתוח' }).click();
  await expect(page.getByLabel('אישור סיום הניתוח')).toBeVisible();
  await page.getByRole('button', { name: 'אישור וסיום' }).click();

  const debrief = page.getByTestId('guided-analysis-debrief').last();
  const reveal = page.getByTestId('historical-replay-reveal');
  await expect(debrief).toBeVisible();
  await expect(reveal).toBeVisible();
  await expect(reveal).toContainText('זהות נחשפה לאחר סיום');
  await expect(reveal).toContainText('תרחיש נתונים סינתטיים שנוצר');
  await expect(reveal).toContainText('Generated fixture 001');
  await expect(reveal).toContainText('2025-01-05T07:00:00.000Z');
  await expect(page.getByTestId('historical-no-credit')).toContainText('לא נוצר ניסיון רגיל');
  expect(await persistedLearningCreditState(page)).toEqual(learningBefore);

  await page.reload();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toBeVisible();
  await expect(page.getByTestId('historical-replay-reveal')).toContainText('Generated fixture 001');
  expect(await persistedLearningCreditState(page)).toEqual(learningBefore);

  await page.getByRole('button', { name: 'היסטוריית ניתוחים' }).click();
  const finalizedHistorical = page.getByTestId('analysis-history-finalized');
  await expect(finalizedHistorical).toHaveCount(1);
  await expect(finalizedHistorical).toContainText('סופי · קריאה בלבד');
  await expect(finalizedHistorical).toContainText('היסטורי נחשף');
  await expect(page.getByTestId('historical-history-reveal')).toContainText(
    'Generated fixture 001',
  );
  await page.getByRole('button', { name: 'פתיחת התחקיר' }).click();
  await expect(page.getByTestId('guided-analysis-debrief').last()).toBeVisible();
  await expect(page.getByRole('button', { name: /הגשת השלב/ })).toHaveCount(0);
  expect(await persistedLearningCreditState(page)).toEqual(learningBefore);
});
