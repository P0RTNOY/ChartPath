import { fireEvent, render } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import { HistoricalScenarioQa } from '../historical-scenario-qa';
import type { RevealedQaCandidateDetail } from '@/data/scenario-qa';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const secretDetail: RevealedQaCandidateDetail = {
  qaKey: 'candidate-01',
  titleHe: 'כותרת סודית לונג',
  scenarioIdentity: 'SECRET-SCENARIO@1.0.0',
  datasetIdentity: 'SECRET-DATASET@1.0.0',
  decisionHe: 'תרחיש לונג',
  difficultyHe: 'מונחה',
  sourceIdentity: 'ta-he-v2 · PDF 72–73 · printed 59–60',
  sourceSectionHe: 'פרק 19 · איור 19.1',
  sourceRationaleHe: 'נימוק מקור סודי',
  chartSpecChecksum: `sha256:${'a'.repeat(64)}`,
  materialArtifactChecksum: `sha256:${'b'.repeat(64)}`,
  datasetChecksum: `sha256:${'c'.repeat(64)}`,
  providerIdentity: 'SECRET-PROVIDER · internal',
  expectedExecutionHe: 'לונג · market · מצב צפוי closed',
  executionEvidence: ['market-entry', 'target'],
  structuralIssues: [],
  publicationBlockers: ['חסם פרסום סודי'],
  publicationCandidate: {
    candidateId: 'publication-candidate-long-v1',
    state: 'publication-candidate',
    materialSetChecksum: `sha256:${'d'.repeat(64)}`,
    reviewPacketPath: 'review-packets/publication-candidate-long-v1/review-packet.canonical.jsonl',
    requiredReviewScopes: [
      'source',
      'rubric',
      'execution',
      'accessibility',
      'hebrew',
      'financial-safety',
      'licensing',
      'publication',
    ],
    sourceProvenance: [
      {
        provenanceId: 'base-scenario:secret',
        role: 'base-scenario',
        sourceId: 'ta-he-v2',
        pdfDocumentId: 'pdf-secret',
        physicalPages: { start: 72, end: 73 },
        printedPages: { start: 59, end: 60 },
        chapter: 'פרק 19',
        figureOrCase: 'איור 19.1',
        reviewedContentIds: ['reviewed-secret'],
        concept: 'מבנה מקור',
        originalSummaryHe: 'סיכום מקור בסיס סודי',
        sourcePdfRightsStatus: 'human-decision-required',
      },
      {
        provenanceId: 'position-management-doctrine:secret',
        role: 'position-management-doctrine',
        sourceId: 'ta-he-v2',
        pdfDocumentId: 'pdf-secret',
        physicalPages: { start: 76, end: 79 },
        printedPages: { start: 63, end: 66 },
        chapter: 'פרק 20',
        figureOrCase: 'עמוד 78',
        reviewedContentIds: ['management-secret'],
        concept: 'ניהול פוזיציה',
        originalSummaryHe: 'סיכום דוקטרינת ניהול סודי',
        sourcePdfRightsStatus: 'human-decision-required',
      },
    ],
  },
};

describe('HistoricalScenarioQa', () => {
  it('keeps identities, source, decision and outcome out until two explicit gates', async () => {
    const revealDetail = jest.fn(() => secretDetail);
    const onStart = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenarioQa
          cards={[
            {
              qaKey: 'candidate-01',
              ordinal: 1,
              readinessHe: 'הידור מבני הושלם — עדיין לא אושר לפרסום',
            },
          ]}
          onStart={onStart}
          revealDetail={revealDetail}
        />
      </ChartPathThemeProvider>,
    );
    const deny =
      /SECRET|כותרת סודית|תרחיש לונג|PDF 72|PDF 76|management-secret|sha256|market-entry|target|publication-candidate-long/;

    expect(JSON.stringify(screen.toJSON())).not.toMatch(deny);
    expect(screen.getByTestId('scenario-qa-enter').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('scenario-qa-ack'));
    expect(screen.getByTestId('scenario-qa-ack').props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByTestId('scenario-qa-enter'));

    expect(screen.getByTestId('scenario-qa-screen')).toBeTruthy();
    expect(screen.getByTestId('scenario-qa-persistent-warning')).toBeTruthy();
    expect(screen.getByTestId('scenario-qa-candidate-candidate-01').props.accessible).toBe(false);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(deny);
    await fireEvent.press(screen.getByTestId('scenario-qa-select-candidate-01'));
    expect(
      screen.getByTestId('scenario-qa-selection-announcement').props.accessibilityLiveRegion,
    ).toBe('polite');
    expect(revealDetail).not.toHaveBeenCalled();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(deny);

    await fireEvent.press(screen.getByTestId('scenario-qa-start-candidate-01'));
    expect(onStart).toHaveBeenCalledWith('candidate-01');
    expect(revealDetail).not.toHaveBeenCalled();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(deny);

    await fireEvent.press(screen.getByTestId('scenario-qa-reveal-candidate-01'));
    expect(revealDetail).toHaveBeenCalledWith('candidate-01');
    expect(screen.getByTestId('scenario-qa-revealed-detail')).toBeTruthy();
    expect(
      screen.getByTestId('scenario-qa-reveal-announcement').props.accessibilityLiveRegion,
    ).toBe('polite');
    expect(screen.getByText('כותרת סודית לונג')).toBeTruthy();
    expect(screen.getByText('SECRET-SCENARIO@1.0.0')).toBeTruthy();
    expect(screen.getByTestId('scenario-qa-blockers')).toBeTruthy();
    expect(screen.getByTestId('scenario-qa-review-packet')).toBeTruthy();
    expect(screen.getByTestId('scenario-qa-source-provenance-1')).toBeTruthy();
    expect(screen.getByTestId('scenario-qa-source-provenance-2')).toBeTruthy();
    expect(screen.getByText('PDF 76–79 · printed 63–66')).toBeTruthy();
    expect(screen.getByText('accessibility')).toBeTruthy();
    expect(screen.getByText('publication-candidate-long-v1')).toBeTruthy();
    expect(screen.getByText('חסם פרסום סודי')).toBeTruthy();
  });

  it('keeps the management shortcut and exposes a separately identified full lifecycle action', async () => {
    const onStart = jest.fn();
    const onStartFullLifecycle = jest.fn();
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <HistoricalScenarioQa
          cards={[
            {
              qaKey: 'candidate-11',
              ordinal: 11,
              readinessHe: 'הידור מבני הושלם — עדיין לא אושר לפרסום',
            },
          ]}
          fullLifecycleQaKeys={['candidate-11']}
          onStart={onStart}
          onStartFullLifecycle={onStartFullLifecycle}
          revealDetail={jest.fn()}
        />
      </ChartPathThemeProvider>,
    );

    await fireEvent.press(screen.getByTestId('scenario-qa-ack'));
    await fireEvent.press(screen.getByTestId('scenario-qa-enter'));
    await fireEvent.press(screen.getByTestId('scenario-qa-select-candidate-11'));

    await fireEvent.press(screen.getByTestId('scenario-qa-start-candidate-11'));
    expect(onStart).toHaveBeenCalledWith('candidate-11');
    expect(onStartFullLifecycle).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('scenario-qa-start-full-lifecycle-candidate-11'));
    expect(onStartFullLifecycle).toHaveBeenCalledWith('candidate-11');
  });
});
