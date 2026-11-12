// CMS publishes many agency names and cities in all caps ("SOUTHERN GRACE
// HOSPICE AND PALLIATIVE CARE", "MCDONOUGH"). Shown as-is they read as
// shouting, and they sit next to mixed-case names in the same list. These
// helpers title-case text that arrives all caps and leave mixed-case text
// alone: a person typed that casing on purpose ("Radiant Hospice & Palliative
// Care, LLC"). Display only. Slugs, lookups and stored values are unchanged.

const SMALL = new Set([
  "a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with",
]);

// Kept upper even though they contain a vowel. Words with no vowel at all
// (LLC, LHC, VNS, BJC) are treated as acronyms automatically.
const ACRONYMS = new Set([
  "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII",
  "USA", "US", "NY", "NYC", "DC",
  "HCA", "VNA", "VNSNY", "AMG", "UAB", "UNC", "UCSF", "UCLA", "UPMC", "OSF", "CHI", "AHN",
  "PA", "PLLC", "DBA", "AKA", "MD", "RN", "LTC", "HHA", "ALS",
]);

// Vowel-less abbreviations that are words, not acronyms: ST LUKE'S -> St Luke's.
const ABBREVIATIONS = {
  ST: "St", FT: "Ft", MT: "Mt", CTR: "Ctr", HLTH: "Hlth", TWP: "Twp", PT: "Pt", RD: "Rd", DR: "Dr",
};

// Chains whose own casing is not plain title case.
const BRANDS = {
  ACCENTCARE: "AccentCare", MERCYONE: "MercyOne", VITAS: "VITAS", PRUITTHEALTH: "PruittHealth",
  PROMEDICA: "ProMedica", CENTERWELL: "CenterWell", HOSPICECARE: "HospiceCare",
};

function isAllCaps(s) {
  return /[A-Z]/.test(s) && !/[a-z]/.test(s);
}

function capWord(w) {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function caseToken(token, isFirst) {
  const upper = token.toUpperCase();
  const lower = token.toLowerCase();
  if (ACRONYMS.has(upper)) return upper;
  if (BRANDS[upper]) return BRANDS[upper];
  if (ABBREVIATIONS[upper]) return ABBREVIATIONS[upper];
  if (!/[AEIOUY]/.test(upper)) return upper;
  if (!isFirst && SMALL.has(lower)) return lower;
  // MCDONOUGH -> McDonough, MCALLEN -> McAllen
  if (/^MC[A-Z]{2,}$/.test(upper)) return "Mc" + capWord(upper.slice(2));
  // O'NEAL -> O'Neal, MOTHER'S -> Mother's, D'ALENE -> D'Alene
  if (token.includes("'")) {
    return token
      .split("'")
      .map((part, i) => (i > 0 && part.length === 1 ? part.toLowerCase() : capWord(part)))
      .join("'");
  }
  return capWord(token);
}

// Title-cases an all-caps name or city. Anything already in mixed case is
// returned untouched.
export function displayName(s) {
  if (typeof s !== "string" || !isAllCaps(s)) return s;
  let first = true;
  return s
    .replace(/[A-Za-z][A-Za-z']*/g, (token, offset) => {
      // Ordinal suffixes stay lower: 1ST -> 1st
      if (offset > 0 && /\d/.test(s[offset - 1]) && /^(ST|ND|RD|TH)$/i.test(token)) {
        return token.toLowerCase();
      }
      // A small word that opens a clause is capitalized: "HOSPICE, THE" -> "Hospice, The"
      const opensClause = first || /[,(\-/:]\s*$/.test(s.slice(0, offset));
      const out = caseToken(token, opensClause);
      first = false;
      return out;
    });
}

// Applies displayName to the name and city fields of a row, in place-safe form.
export function withDisplayNames(row) {
  if (!row) return row;
  return {
    ...row,
    hospice_name: displayName(row.hospice_name),
    city: displayName(row.city),
  };
}
