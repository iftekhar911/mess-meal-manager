import { MealResolver } from './meal-resolver';
import { SlotType, MealType, EggPreference, RuleKind, OverrideSource } from '@mess/shared';

describe('MealResolver', () => {
  const defaultFullProfile = {
    mealType: MealType.FULL,
    halfSlot: null,
    eggPreference: EggPreference.NONE
  };

  const defaultHalfLunchProfile = {
    mealType: MealType.HALF,
    halfSlot: SlotType.LUNCH,
    eggPreference: EggPreference.INSTEAD_OF_FISH
  };

  it('should resolve full meal active for lunch and dinner from default profile', () => {
    const lunch = MealResolver.resolveSlot(SlotType.LUNCH, '2026-11-20', defaultFullProfile);
    const dinner = MealResolver.resolveSlot(SlotType.DINNER, '2026-11-20', defaultFullProfile);

    expect(lunch.status).toBe(true);
    expect(lunch.resolutionSource).toBe('DEFAULT_PROFILE');
    expect(dinner.status).toBe(true);
    expect(dinner.resolutionSource).toBe('DEFAULT_PROFILE');
  });

  it('should resolve half meal profile correctly per slot', () => {
    const lunch = MealResolver.resolveSlot(SlotType.LUNCH, '2026-11-20', defaultHalfLunchProfile);
    const dinner = MealResolver.resolveSlot(SlotType.DINNER, '2026-11-20', defaultHalfLunchProfile);

    expect(lunch.status).toBe(true);
    expect(lunch.eggPreference).toBe(EggPreference.INSTEAD_OF_FISH);
    expect(dinner.status).toBe(false);
  });

  it('should respect continuous toggle rule when set to OFF', () => {
    const rules = [
      {
        fromDate: '2026-11-15',
        toDate: null,
        status: false,
        kind: RuleKind.TOGGLE
      }
    ];

    const result = MealResolver.resolveSlot(
      SlotType.LUNCH,
      '2026-11-20',
      defaultFullProfile,
      rules
    );

    expect(result.status).toBe(false);
    expect(result.resolutionSource).toBe('TOGGLE_RULE');
  });

  it('should prioritize date range leave over continuous toggle and default profile', () => {
    const rules = [
      {
        fromDate: '2026-11-10',
        toDate: null,
        status: true,
        kind: RuleKind.TOGGLE
      },
      {
        fromDate: '2026-11-18',
        toDate: '2026-11-22',
        status: false,
        kind: RuleKind.RANGE
      }
    ];

    const duringRange = MealResolver.resolveSlot(
      SlotType.LUNCH,
      '2026-11-20',
      defaultFullProfile,
      rules
    );
    const outsideRange = MealResolver.resolveSlot(
      SlotType.LUNCH,
      '2026-11-25',
      defaultFullProfile,
      rules
    );

    expect(duringRange.status).toBe(false);
    expect(duringRange.resolutionSource).toBe('RANGE_RULE');
    expect(outsideRange.status).toBe(true);
    expect(outsideRange.resolutionSource).toBe('TOGGLE_RULE');
  });

  it('should prioritize single-day override over all other rules', () => {
    const rules = [
      {
        fromDate: '2026-11-18',
        toDate: '2026-11-22',
        status: false,
        kind: RuleKind.RANGE
      }
    ];

    const overrides = [
      {
        date: '2026-11-20',
        slot: SlotType.LUNCH,
        status: true,
        eggPreference: EggPreference.INSTEAD_OF_CHICKEN,
        guestCount: 2,
        source: OverrideSource.BOARDER
      }
    ];

    const result = MealResolver.resolveSlot(
      SlotType.LUNCH,
      '2026-11-20',
      defaultFullProfile,
      rules,
      overrides
    );

    expect(result.status).toBe(true);
    expect(result.eggPreference).toBe(EggPreference.INSTEAD_OF_CHICKEN);
    expect(result.guestCount).toBe(2);
    expect(result.resolutionSource).toBe('OVERRIDE');
  });
});
