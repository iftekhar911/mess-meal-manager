import { RosterSource } from '@mess/shared';

export interface BoarderDutyProfile {
  membershipId: string;
  assignedCount: number;
  isAvailableOnDate: (date: string) => boolean;
}

export interface ExistingAssignment {
  date: string;
  membershipId: string;
  source: RosterSource;
}

export interface DaySlotDemand {
  date: string;
  requiredShoppers: number;
}

/**
 * Pure domain class for fair distribution of unassigned shopping roster slots.
 * Ensures shoppers are evenly assigned and absent boarders are never scheduled.
 */
export class RosterShuffler {
  /**
   * Auto shuffles unassigned shopping duty slots fairly among eligible boarders.
   *
   * @param demands - Days in month and required shoppers per day.
   * @param boarders - Pool of boarders with current duty counts and availability checks.
   * @param existingVotes - Already committed votes or assignments.
   * @returns Complete roster assignments including auto-assigned days.
   */
  public static autoShuffle(
    demands: DaySlotDemand[],
    boarders: BoarderDutyProfile[],
    existingVotes: ExistingAssignment[] = []
  ): ExistingAssignment[] {
    const assignments: ExistingAssignment[] = [...existingVotes];

    // Track assignments per boarder
    const dutyCounts = new Map<string, number>();
    for (const b of boarders) {
      dutyCounts.set(b.membershipId, b.assignedCount);
    }
    for (const v of existingVotes) {
      const current = dutyCounts.get(v.membershipId) || 0;
      dutyCounts.set(v.membershipId, current + 1);
    }

    for (const demand of demands) {
      const alreadyAssigned = assignments.filter((a) => a.date === demand.date);
      let needed = demand.requiredShoppers - alreadyAssigned.length;

      if (needed <= 0) continue;

      // Find candidates available on this date who are not already assigned today
      const assignedIdsToday = new Set(alreadyAssigned.map((a) => a.membershipId));

      const eligible = boarders
        .filter((b) => !assignedIdsToday.has(b.membershipId) && b.isAvailableOnDate(demand.date))
        // Sort ascending by duty count (fairness: least duties assigned first)
        .sort((a, b) => {
          const countA = dutyCounts.get(a.membershipId) || 0;
          const countB = dutyCounts.get(b.membershipId) || 0;
          return countA - countB;
        });

      for (const candidate of eligible) {
        if (needed <= 0) break;

        assignments.push({
          date: demand.date,
          membershipId: candidate.membershipId,
          source: RosterSource.AUTO
        });

        const current = dutyCounts.get(candidate.membershipId) || 0;
        dutyCounts.set(candidate.membershipId, current + 1);
        needed--;
      }
    }

    return assignments;
  }
}
