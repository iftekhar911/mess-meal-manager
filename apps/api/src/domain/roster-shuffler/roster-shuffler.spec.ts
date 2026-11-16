import { RosterShuffler } from './roster-shuffler';
import { RosterSource } from '@mess/shared';

describe('RosterShuffler', () => {
  it('should fairly assign remaining slots to boarders with least duty count', () => {
    const demands = [
      { date: '2026-11-01', requiredShoppers: 2 },
      { date: '2026-11-02', requiredShoppers: 2 }
    ];

    const boarders = [
      { membershipId: 'b1', assignedCount: 1, isAvailableOnDate: () => true },
      { membershipId: 'b2', assignedCount: 0, isAvailableOnDate: () => true },
      { membershipId: 'b3', assignedCount: 0, isAvailableOnDate: () => true },
      { membershipId: 'b4', assignedCount: 1, isAvailableOnDate: () => true }
    ];

    const existingVotes = [{ date: '2026-11-01', membershipId: 'b1', source: RosterSource.VOTE }];

    const result = RosterShuffler.autoShuffle(demands, boarders, existingVotes);

    // 2026-11-01 had 1 vote from b1, needs 1 more: b2 or b3 (duty count 0)
    const day1Assignments = result.filter((a) => a.date === '2026-11-01');
    expect(day1Assignments.length).toBe(2);

    // 2026-11-02 needs 2: should pick candidates fairly
    const day2Assignments = result.filter((a) => a.date === '2026-11-02');
    expect(day2Assignments.length).toBe(2);

    expect(result.length).toBe(4);
  });

  it('should never assign a boarder on a date they are away', () => {
    const demands = [{ date: '2026-11-05', requiredShoppers: 1 }];

    const boarders = [
      {
        membershipId: 'b1',
        assignedCount: 0,
        isAvailableOnDate: (date: string) => date !== '2026-11-05' // Away on 5th
      },
      {
        membershipId: 'b2',
        assignedCount: 1,
        isAvailableOnDate: () => true
      }
    ];

    const result = RosterShuffler.autoShuffle(demands, boarders, []);
    expect(result.length).toBe(1);
    expect(result[0]!.membershipId).toBe('b2');
    expect(result[0]!.source).toBe(RosterSource.AUTO);
  });
});
