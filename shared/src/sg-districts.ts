/**
 * Singapore postal districts (official 28-district scheme) with their key
 * localities / estates. Used to power district + location search and to keep
 * location naming consistent across the CRM.
 *
 * Reference: Singapore postal district map (URA / common real-estate usage).
 */

export interface SgDistrict {
  /** District code, e.g. "D13" */
  code: string;
  /** Numeric district number, e.g. 13 */
  number: number;
  /** General region: Core Central (CCR), Rest of Central (RCR), Outside Central (OCR) */
  region: "CCR" | "RCR" | "OCR";
  /** Localities / estates commonly associated with this district */
  localities: string[];
}

export const SG_DISTRICTS: SgDistrict[] = [
  { code: "D01", number: 1, region: "CCR", localities: ["Raffles Place", "Cecil", "Marina", "People's Park"] },
  { code: "D02", number: 2, region: "CCR", localities: ["Anson", "Tanjong Pagar"] },
  { code: "D03", number: 3, region: "RCR", localities: ["Queenstown", "Tiong Bahru", "Alexandra", "Bukit Merah"] },
  { code: "D04", number: 4, region: "RCR", localities: ["Telok Blangah", "Harbourfront", "Keppel", "Sentosa"] },
  { code: "D05", number: 5, region: "RCR", localities: ["Pasir Panjang", "Clementi New Town", "Hong Leong Garden", "West Coast"] },
  { code: "D06", number: 6, region: "CCR", localities: ["High Street", "Beach Road (part)", "City Hall"] },
  { code: "D07", number: 7, region: "RCR", localities: ["Middle Road", "Golden Mile", "Beach Road", "Bugis", "Rochor"] },
  { code: "D08", number: 8, region: "RCR", localities: ["Little India", "Farrer Park", "Serangoon Road"] },
  { code: "D09", number: 9, region: "CCR", localities: ["Orchard", "Cairnhill", "River Valley"] },
  { code: "D10", number: 10, region: "CCR", localities: ["Ardmore", "Bukit Timah", "Holland Road", "Tanglin"] },
  { code: "D11", number: 11, region: "CCR", localities: ["Watten Estate", "Novena", "Thomson", "Newton"] },
  { code: "D12", number: 12, region: "RCR", localities: ["Balestier", "Toa Payoh", "Serangoon", "Whampoa"] },
  { code: "D13", number: 13, region: "RCR", localities: ["Macpherson", "Braddell", "Potong Pasir"] },
  { code: "D14", number: 14, region: "RCR", localities: ["Geylang", "Eunos", "Paya Lebar", "Kembangan"] },
  { code: "D15", number: 15, region: "RCR", localities: ["Katong", "Joo Chiat", "Amber Road", "Marine Parade", "Tanjong Rhu"] },
  { code: "D16", number: 16, region: "OCR", localities: ["Bedok", "Upper East Coast", "Eastwood", "Kew Drive", "Siglap"] },
  { code: "D17", number: 17, region: "OCR", localities: ["Loyang", "Changi", "Flora Drive"] },
  { code: "D18", number: 18, region: "OCR", localities: ["Tampines", "Pasir Ris", "Simei"] },
  { code: "D19", number: 19, region: "OCR", localities: ["Serangoon Garden", "Hougang", "Punggol", "Sengkang", "Kovan"] },
  { code: "D20", number: 20, region: "OCR", localities: ["Bishan", "Ang Mo Kio", "Thomson (upper)"] },
  { code: "D21", number: 21, region: "OCR", localities: ["Upper Bukit Timah", "Clementi Park", "Ulu Pandan", "Hillview"] },
  { code: "D22", number: 22, region: "OCR", localities: ["Jurong", "Boon Lay", "Tuas", "Jurong East", "Jurong West"] },
  { code: "D23", number: 23, region: "OCR", localities: ["Hillview", "Dairy Farm", "Bukit Panjang", "Choa Chu Kang", "Bukit Batok"] },
  { code: "D24", number: 24, region: "OCR", localities: ["Lim Chu Kang", "Tengah", "Kranji"] },
  { code: "D25", number: 25, region: "OCR", localities: ["Woodlands", "Admiralty"] },
  { code: "D26", number: 26, region: "OCR", localities: ["Upper Thomson", "Springleaf", "Mandai", "Tagore"] },
  { code: "D27", number: 27, region: "OCR", localities: ["Yishun", "Sembawang", "Admiralty (part)"] },
  { code: "D28", number: 28, region: "OCR", localities: ["Seletar", "Yio Chu Kang", "Jalan Kayu"] },
];

/** HDB towns (for quick town-based filtering / tagging). */
export const HDB_TOWNS: string[] = [
  "Ang Mo Kio", "Bedok", "Bishan", "Bukit Batok", "Bukit Merah", "Bukit Panjang",
  "Bukit Timah", "Central Area", "Choa Chu Kang", "Clementi", "Geylang", "Hougang",
  "Jurong East", "Jurong West", "Kallang/Whampoa", "Marine Parade", "Pasir Ris",
  "Punggol", "Queenstown", "Sembawang", "Sengkang", "Serangoon", "Tampines",
  "Toa Payoh", "Woodlands", "Yishun",
];

/** Flattened list of every locality, each tagged with its district, for search. */
export interface LocalityIndexEntry {
  locality: string;
  districtCode: string;
  districtNumber: number;
  region: SgDistrict["region"];
}

export const LOCALITY_INDEX: LocalityIndexEntry[] = SG_DISTRICTS.flatMap((d) =>
  d.localities.map((locality) => ({
    locality,
    districtCode: d.code,
    districtNumber: d.number,
    region: d.region,
  })),
);

/** Resolve a free-text location hint to a district, if recognisable. */
export function findDistrictForLocation(input: string): SgDistrict | undefined {
  const q = input.trim().toLowerCase();
  if (!q) return undefined;

  // Direct district code / number match, e.g. "D13", "district 13", "13"
  const codeMatch = q.match(/d?\s*(\d{1,2})/);
  if (codeMatch) {
    const num = Number(codeMatch[1]);
    const byNum = SG_DISTRICTS.find((d) => d.number === num);
    if (byNum && /d|district/.test(q)) return byNum;
    // bare number: only match if it looks like a district number
    if (byNum && q === String(num)) return byNum;
  }

  // Locality name match
  return SG_DISTRICTS.find((d) =>
    d.localities.some((loc) => loc.toLowerCase().includes(q) || q.includes(loc.toLowerCase())),
  );
}
