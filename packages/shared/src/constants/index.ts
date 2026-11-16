/**
 * Business constants for Mess Meal Manager.
 * All time operations evaluate against the Dhaka timezone.
 */
export const ASIA_DHAKA_TZ = 'Asia/Dhaka';

/** Default cutoff time string in HH:mm:ss format (22:00:00 = 10 PM Bangladesh Standard Time). */
export const DEFAULT_CUTOFF_TIME = '22:00:00';

/** Default grace period in days before meals are automatically switched off. */
export const DEFAULT_GRACE_DAYS = 3;

/** Default warning threshold in days before estimated balance depletion. */
export const DEFAULT_WARNING_DAYS = 2;

/** Default number of shoppers assigned per day. */
export const DEFAULT_SHOPPERS_PER_DAY = 2;

/** Default target shopping duties per boarder per month. */
export const DEFAULT_SHOP_TIMES_PER_MONTH = 2;

/** Each slot (lunch or dinner) equals 0.5 meal unit. */
export const MEAL_UNITS_PER_SLOT = 0.5;

/** Default estimated meal rate in BDT. */
export const DEFAULT_ESTIMATED_MEAL_RATE = 50.0;

/** Default monthly cook bill in BDT. */
export const DEFAULT_COOK_BILL = 250.0;
