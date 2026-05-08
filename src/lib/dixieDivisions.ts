/**
 * Dixie Amateur — division & senior subdivision helpers.
 *
 * Players in the senior-midmaster division are further categorized into
 * three subdivisions based on their age on the tournament date (Dec 9, 2026):
 *   - mid-master:   40–54
 *   - senior:       55–64
 *   - super-senior: 65+
 */

export const TOURNAMENT_DATE = { year: 2026, month: 12, day: 9 } as const;

export type SeniorSubdivision = "mid-master" | "senior" | "super-senior";

export const DIVISION_LABELS: Record<string, string> = {
  mens:   "Men's",
  womens: "Women's",
  senior: "Senior/Mid-Master",
};

export const SUBDIVISION_LABELS: Record<SeniorSubdivision, string> = {
  "mid-master":   "Mid-Master",
  "senior":       "Senior",
  "super-senior": "Super Senior",
};

export const SUBDIVISION_AGE_RANGES: Record<SeniorSubdivision, string> = {
  "mid-master":   "40–54",
  "senior":       "55–64",
  "super-senior": "65+",
};

/** Filter sentinel values for the division dropdown. */
export const SUBDIVISION_FILTER_PREFIX = "sub:";

/** Age (in whole years) on the tournament date, or null if DOB is incomplete. */
export function ageOnTournamentDate(
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  birthDay: number | null | undefined,
): number | null {
  if (!birthYear || !birthMonth || !birthDay) return null;
  let age = TOURNAMENT_DATE.year - birthYear;
  const beforeBirthday =
    birthMonth > TOURNAMENT_DATE.month ||
    (birthMonth === TOURNAMENT_DATE.month && birthDay > TOURNAMENT_DATE.day);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Subdivision for senior division; null otherwise or if DOB is missing. */
export function getSeniorSubdivision(
  division: string | null | undefined,
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  birthDay: number | null | undefined,
): SeniorSubdivision | null {
  if (division !== "senior") return null;
  const age = ageOnTournamentDate(birthYear, birthMonth, birthDay);
  if (age === null) return null;
  if (age >= 65) return "super-senior";
  if (age >= 55) return "senior";
  if (age >= 40) return "mid-master";
  return null;
}

/**
 * Display string combining division label with senior subdivision when applicable.
 * e.g. "Senior/Mid-Master · Super Senior"  or  "Men's"
 */
export function formatDivision(
  division: string | null | undefined,
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  birthDay: number | null | undefined,
): string | null {
  if (!division) return null;
  const base = DIVISION_LABELS[division] ?? division;
  const sub = getSeniorSubdivision(division, birthYear, birthMonth, birthDay);
  return sub ? `${base} · ${SUBDIVISION_LABELS[sub]}` : base;
}

/**
 * Sortable key combining division with subdivision order.
 * Within senior: mid-master (1) < senior (2) < super-senior (3) < unknown (9).
 */
export function divisionSortKey(
  division: string | null | undefined,
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  birthDay: number | null | undefined,
): string {
  const base = division ?? "zzz";
  if (division !== "senior") return base;
  const sub = getSeniorSubdivision(division, birthYear, birthMonth, birthDay);
  const subOrder: Record<string, string> = {
    "mid-master":   "1",
    "senior":       "2",
    "super-senior": "3",
  };
  return `${base}-${sub ? subOrder[sub] : "9"}`;
}

/**
 * Apply a division-filter dropdown value to a record. Values:
 *   - "all"                       → match everything
 *   - "mens" / "womens" / "senior" → match base division
 *   - "sub:<subdivision>"         → match senior division with that subdivision
 */
export function matchesDivisionFilter(
  filterValue: string,
  division: string | null | undefined,
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  birthDay: number | null | undefined,
): boolean {
  if (filterValue === "all") return true;
  if (filterValue.startsWith(SUBDIVISION_FILTER_PREFIX)) {
    if (division !== "senior") return false;
    const wanted = filterValue.slice(SUBDIVISION_FILTER_PREFIX.length) as SeniorSubdivision;
    return getSeniorSubdivision(division, birthYear, birthMonth, birthDay) === wanted;
  }
  return division === filterValue;
}
