import { SlotType, MealType, EggPreference, RuleKind, OverrideSource } from '@mess/shared';

export interface MealDefaultInput {
  mealType: MealType;
  halfSlot: SlotType | null;
  eggPreference: EggPreference;
}

export interface MealRuleInput {
  fromDate: string;
  toDate: string | null;
  status: boolean;
  kind: RuleKind;
}

export interface MealOverrideInput {
  date: string;
  slot: SlotType;
  status: boolean;
  eggPreference: EggPreference;
  guestCount: number;
  source: OverrideSource;
}

export interface ResolvedSlotMeal {
  slot: SlotType;
  status: boolean;
  eggPreference: EggPreference;
  guestCount: number;
  resolutionSource: 'OVERRIDE' | 'RANGE_RULE' | 'TOGGLE_RULE' | 'DEFAULT_PROFILE';
}

/**
 * Pure domain class resolving final meal state for a specific slot.
 *
 * Resolution priority:
 * 1. Single-day override (highest priority)
 * 2. Date range rule
 * 3. Continuous on/off toggle
 * 4. Permanent default profile (lowest priority)
 */
export class MealResolver {
  /**
   * Resolves the slot meal state given active defaults, rules, and overrides.
   *
   * @param slot - Target slot (LUNCH or DINNER).
   * @param targetDate - ISO date string (YYYY-MM-DD).
   * @param defaultProfile - Permanent default preferences.
   * @param rules - List of active range or toggle rules.
   * @param overrides - List of single-day overrides.
   * @returns Resolved slot configuration.
   */
  public static resolveSlot(
    slot: SlotType,
    targetDate: string,
    defaultProfile: MealDefaultInput,
    rules: MealRuleInput[] = [],
    overrides: MealOverrideInput[] = []
  ): ResolvedSlotMeal {
    // 1. Single-day override for this date and slot
    const slotOverride = overrides.find((o) => o.date === targetDate && o.slot === slot);
    if (slotOverride) {
      return {
        slot,
        status: slotOverride.status,
        eggPreference: slotOverride.eggPreference,
        guestCount: slotOverride.guestCount,
        resolutionSource: 'OVERRIDE'
      };
    }

    // 2. Date range rule matching targetDate
    const rangeRule = rules.find((r) => {
      if (r.kind !== RuleKind.RANGE) return false;
      if (r.toDate) {
        return targetDate >= r.fromDate && targetDate <= r.toDate;
      }
      return targetDate >= r.fromDate;
    });

    if (rangeRule) {
      return {
        slot,
        status: rangeRule.status,
        eggPreference: defaultProfile.eggPreference,
        guestCount: 0,
        resolutionSource: 'RANGE_RULE'
      };
    }

    // 3. Continuous toggle rule (most recent toggle rule effective on or before targetDate)
    const toggleRule = rules
      .filter((r) => r.kind === RuleKind.TOGGLE && targetDate >= r.fromDate)
      .sort((a, b) => b.fromDate.localeCompare(a.fromDate))[0];

    if (toggleRule) {
      if (!toggleRule.status) {
        return {
          slot,
          status: false,
          eggPreference: defaultProfile.eggPreference,
          guestCount: 0,
          resolutionSource: 'TOGGLE_RULE'
        };
      }
      // If toggle is ON, status falls back to whether this slot is eaten in default profile
      const isSlotActive =
        defaultProfile.mealType === MealType.FULL ||
        (defaultProfile.mealType === MealType.HALF && defaultProfile.halfSlot === slot);

      return {
        slot,
        status: isSlotActive,
        eggPreference: defaultProfile.eggPreference,
        guestCount: 0,
        resolutionSource: 'TOGGLE_RULE'
      };
    }

    // 4. Permanent default profile
    const isDefaultActive =
      defaultProfile.mealType === MealType.FULL ||
      (defaultProfile.mealType === MealType.HALF && defaultProfile.halfSlot === slot);

    return {
      slot,
      status: isDefaultActive,
      eggPreference: defaultProfile.eggPreference,
      guestCount: 0,
      resolutionSource: 'DEFAULT_PROFILE'
    };
  }
}
