import type { Attempt } from '@chartpath/domain';

import { InMemoryPersistenceAdapter, LearningRepository } from '../persistence';

const attempt: Attempt = {
  id: 'completion-attempt',
  exerciseId: 'L01-E05',
  contentVersionId: 'test-content',
  startedAt: '2026-08-23T08:00:00.000Z',
  submittedAt: '2026-08-23T08:01:00.000Z',
  answer: { kind: 'multiple-choice', optionId: 'wait' },
  result: {
    correct: true,
    score: 1,
    feedbackCode: 'correct',
    details: [],
    misconceptionIds: [],
    graderVersion: '1.0.0',
  },
  hintIdsUsed: [],
};

describe('lesson completion persistence integration', () => {
  it('resumes a completed lesson from the append-only attempt stream', async () => {
    const adapter = new InMemoryPersistenceAdapter();
    const repository = new LearningRepository(adapter, {
      contentVersion: 'test-content',
      now: () => '2026-08-23T08:01:00.000Z',
    });
    await repository.initialize();
    await repository.appendAttempt({
      attempt,
      lessonId: 'L01',
      skillIds: ['safe-scenarios'],
      difficulty: 1,
      exerciseVersion: 1,
      isReview: false,
      xpAwarded: 20,
      activityDate: '2026-08-23',
      dailyGoalMinutes: 10,
      activeMinutes: 1,
      completesLesson: true,
    });

    const reopened = new LearningRepository(adapter, {
      contentVersion: 'test-content',
      now: () => '2026-08-23T08:02:00.000Z',
    });
    const snapshot = await reopened.initialize();
    expect(snapshot.projections.lessonProgress.L01?.status).toBe('completed');
    expect(snapshot.projections.lessonProgress.L01?.completedAt).toBe(attempt.submittedAt);
    expect(snapshot.attempts).toHaveLength(1);
  });
});
