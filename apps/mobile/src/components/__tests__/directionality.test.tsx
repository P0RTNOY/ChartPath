import { render } from '@testing-library/react-native';

import { ChartPathThemeProvider } from '@chartpath/ui';

import { Glyph } from '../glyph';
import { TopBar } from '../top-bar';

describe('shared direction-aware navigation', () => {
  it('points back toward the RTL leading edge and keeps English subtitles LTR', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="rtl" mode="light">
        <TopBar back subtitle="Scenarios, not predictions" subtitleDirection="ltr" title="שיעור" />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText('›', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Scenarios, not predictions')).toHaveStyle({
      direction: undefined,
      // The native RTL root mirrors physical edges; this renders visually left-aligned.
      textAlign: 'right',
      writingDirection: 'ltr',
    });
    expect(screen.getByRole('button', { name: 'חזרה למסך הקודם' })).toBeTruthy();
  });

  it('uses the conventional LTR back glyph when the shared component is rendered in English', async () => {
    const screen = await render(
      <ChartPathThemeProvider direction="ltr" mode="light">
        <Glyph name="back" />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByText('‹', { includeHiddenElements: true })).toBeTruthy();
  });
});
