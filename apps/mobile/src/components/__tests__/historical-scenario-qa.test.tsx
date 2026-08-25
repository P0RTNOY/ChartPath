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
    const deny = /SECRET|כותרת סודית|תרחיש לונג|PDF 72|sha256|market-entry|target/;

    expect(JSON.stringify(screen.toJSON())).not.toMatch(deny);
    expect(screen.getByTestId('scenario-qa-enter').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('scenario-qa-ack'));
    await fireEvent.press(screen.getByTestId('scenario-qa-enter'));

    expect(screen.getByTestId('scenario-qa-screen')).toBeTruthy();
    expect(screen.getByTestId('scenario-qa-persistent-warning')).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(deny);
    await fireEvent.press(screen.getByTestId('scenario-qa-select-candidate-01'));
    expect(revealDetail).not.toHaveBeenCalled();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(deny);

    await fireEvent.press(screen.getByTestId('scenario-qa-start-candidate-01'));
    expect(onStart).toHaveBeenCalledWith('candidate-01');
    expect(revealDetail).not.toHaveBeenCalled();
    expect(JSON.stringify(screen.toJSON())).not.toMatch(deny);

    await fireEvent.press(screen.getByTestId('scenario-qa-reveal-candidate-01'));
    expect(revealDetail).toHaveBeenCalledWith('candidate-01');
    expect(screen.getByTestId('scenario-qa-revealed-detail')).toBeTruthy();
    expect(screen.getByText('כותרת סודית לונג')).toBeTruthy();
    expect(screen.getByText('SECRET-SCENARIO@1.0.0')).toBeTruthy();
    expect(screen.getByTestId('scenario-qa-blockers')).toBeTruthy();
    expect(screen.getByText('חסם פרסום סודי')).toBeTruthy();
  });
});
