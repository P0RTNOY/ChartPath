import { render } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import { InternalQaBoundaryBanner } from '../internal-qa-boundary-banner';

describe('InternalQaBoundaryBanner', () => {
  it.each(['qa-internal', 'qa-hypothetical-mechanics'] as const)(
    'persists the unpublished no-credit boundary for %s',
    async (accessMode) => {
      const screen = await render(
        <ChartPathThemeProvider direction="rtl" mode="light">
          <InternalQaBoundaryBanner accessMode={accessMode} />
        </ChartPathThemeProvider>,
      );
      expect(screen.getByTestId('internal-qa-boundary')).toBeTruthy();
      expect(screen.getByLabelText(/לא פורסם.*אינו מקבל קרדיט.*אינו אישור/)).toBeTruthy();
    },
  );

  it('is absent from ordinary learner mode', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <InternalQaBoundaryBanner accessMode="ordinary" />
      </ChartPathThemeProvider>,
    );
    expect(screen.queryByTestId('internal-qa-boundary')).toBeNull();
  });
});
