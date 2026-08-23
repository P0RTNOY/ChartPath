import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { ChartPathThemeProvider, Feedback } from '@chartpath/ui';

describe('reduced motion', () => {
  it('reveals feedback immediately without starting a timing animation', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const screen = await render(
      <ChartPathThemeProvider mode="light" reducedMotion>
        <Feedback message="המשוב גלוי מיד" title="משוב" />
      </ChartPathThemeProvider>,
    );

    expect(screen.getByRole('alert', { name: 'משוב. המשוב גלוי מיד' })).toBeTruthy();
    expect(timing).not.toHaveBeenCalled();
    timing.mockRestore();
  });
});
