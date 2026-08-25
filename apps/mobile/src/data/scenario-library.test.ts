import { publishedScenarioLibraryCards } from './scenario-library';

describe('scenario library projections', () => {
  it('keeps the ordinary catalog empty while every installed record is internal or blocked', () => {
    expect(publishedScenarioLibraryCards()).toEqual([]);
  });
});
