import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/components/app-state';
import { HistoricalScenarioQa } from '@/components/historical-scenario-qa';
import { TopBar } from '@/components/top-bar';
import {
  blindQaCandidateCards,
  completePositionManagementQaAnalysis,
  positionManagementQaJourneyForKey,
  qaScenarioIdentityForKey,
  revealedQaCandidateDetail,
} from '@/data/scenario-qa';
import { isInternalReviewerModeEnabled } from '@/lib/internal-reviewer-mode';
import { useLearning } from '@/state/learning';
import { Screen } from '@chartpath/ui';

export default function HistoricalScenarioQaRoute() {
  const learning = useLearning();
  const { developer } = useLocalSearchParams<{ developer?: string | string[] }>();
  const [startingKey, setStartingKey] = useState<string>();
  const [startError, setStartError] = useState<string | null>(null);
  const developerFlag = Array.isArray(developer) ? developer[0] : developer;
  if (!isInternalReviewerModeEnabled() || developerFlag !== '1') {
    return (
      <Screen testID="scenario-qa-unavailable">
        <TopBar back title="QA תרחישים" />
        <EmptyState
          message="הכלי אינו זמין במסלול הלמידה הרגיל ונפתח רק מתוך קטלוג המפתחים."
          title="כלי QA פנימי אינו פעיל"
        />
      </Screen>
    );
  }

  const start = async (qaKey: string) => {
    const identity = qaScenarioIdentityForKey(qaKey);
    const managementJourney = positionManagementQaJourneyForKey(qaKey);
    if (!identity) {
      setStartError('מועמד ה־QA אינו זמין עוד ברישום הפנימי.');
      return;
    }
    setStartingKey(qaKey);
    setStartError(null);
    try {
      let session = await learning.createOrResumeAnalysisSession({
        kind: 'historical',
        scenarioId: identity.scenarioId,
        scenarioVersion: identity.scenarioVersion,
        accessMode: 'qa-internal',
      });
      if (managementJourney) {
        if (session.status === 'abandoned') {
          session = await learning.restartAnalysisSession(session.sessionId);
        }
        if (session.status === 'active') {
          const completed = completePositionManagementQaAnalysis(session);
          session = await learning.saveAnalysisSession(completed);
          await learning.finalizeAnalysisSession(session);
        }
        let paper = await learning.createOrResumePaperExecutionSession(
          session.sessionId,
          managementJourney.plan,
          'qa-internal',
        );
        if (paper.status === 'draft') {
          paper = await learning.submitPaperExecutionSession(
            paper.sessionId,
            `management-qa-submit:${paper.sessionId}`,
            'qa-internal',
          );
        }
        if (paper.status === 'working') {
          paper = await learning.advancePaperExecutionSession(paper.sessionId, 1, 'qa-internal');
        }
        if (paper.status !== 'open' || paper.position?.status !== 'open') {
          throw new Error('מסע ה־QA לא יצר פוזיציית נייר פתוחה ומדויקת לניהול.');
        }
        await learning.createOrResumePositionManagementSession(paper.sessionId, 'qa-internal');
        router.push(
          `/paper-execution?analysisSessionId=${encodeURIComponent(session.sessionId)}&qa=1` as Href,
        );
        return;
      }
      router.push(`/analysis?sessionId=${encodeURIComponent(session.sessionId)}&qa=1` as Href);
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : 'לא הצלחנו לפתוח את מועמד ה־QA.');
    } finally {
      setStartingKey(undefined);
    }
  };

  return (
    <HistoricalScenarioQa
      cards={blindQaCandidateCards()}
      onStart={(qaKey) => void start(qaKey)}
      revealDetail={revealedQaCandidateDetail}
      startError={startError}
      startingKey={startingKey}
    />
  );
}
