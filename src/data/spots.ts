export type SpotStatus = "open" | "limited" | "full" | "unknown";
export type Ownership = "public" | "private";

/** Recurring weekly window a private spot is rentable in. null = always. */
export type AvailabilityWindow = {
  /** 0 = Sunday .. 6 = Saturday */
  days: number[];
  start: string; // "HH:mm", 24-hour
  end: string; // "HH:mm", 24-hour, must be later than start (no overnight wrap)
} | null;

export type Spot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: SpotStatus;
  verified: boolean;
  type: string;
  ownership: Ownership;
  /** Rupees per hour, used for sorting/filtering. 0 = free. */
  pricePerHour: number;
  /** The actual published tariff structure, shown in the detail sheet. */
  priceNote: string;
  charging: boolean;
  /** Only meaningful when charging is true. */
  connectorType: string | null;
  chargingSpeedKw: number | null;
  availability: AvailabilityWindow;
};

export const DELHI_CENTER: [number, number] = [28.6139, 77.209];

const MCD_STANDARD_NOTE = "₹20/hr, ₹100 max per day (MCD standard rate)";
const MCD_MULTILEVEL_NOTE = "≈₹30/hr (MCD multilevel site, commercial district rate)";
const MALL_NOTE = "₹100 for the first 4 hrs, ₹20/hr after (mall tariff)";
const FREE_NOTE = "Free — DDA-maintained public grounds";
const MONUMENT_NOTE = "₹20/hr (ASI-managed monument parking)";

// Pricing is based on published Delhi parking tariffs: NDMC's ₹20/hr
// (up to 5 hrs, ₹100 flat beyond) policy for Connaught Place/Khan Market,
// the standard MCD on-street rate (₹20/hr, ₹100/day cap), the MCD premium
// site tier at Karol Bagh (₹40 for hour 1, rising per hour, ₹300/day cap),
// and Select Citywalk's posted mall tariff (₹100 for the first 4 hrs,
// ₹20/hr after). Private listings are owner-set, not government tariffs.
export const spots: Spot[] = [
  {
    id: "cp-inner-circle",
    name: "Connaught Place — Inner Circle",
    lat: 28.6315,
    lng: 77.2167,
    status: "open",
    verified: true,
    type: "Multilevel parking",
    ownership: "public",
    pricePerHour: 20,
    priceNote: "₹20/hr up to 5 hrs, ₹100 flat beyond (NDMC rate)",
    charging: true,
    connectorType: "Type 2 (AC)",
    chargingSpeedKw: 7,
    availability: null,
  },
  {
    id: "khan-market",
    name: "Khan Market",
    lat: 28.6001,
    lng: 77.2276,
    status: "limited",
    verified: true,
    type: "Surface lot",
    ownership: "public",
    pricePerHour: 20,
    priceNote: "₹20/hr up to 5 hrs, ₹100 flat beyond (NDMC rate)",
    charging: false,
    connectorType: null,
    chargingSpeedKw: null,
    availability: null,
  },
  {
    id: "hauz-khas-village",
    name: "Hauz Khas Village",
    lat: 28.5535,
    lng: 77.1892,
    status: "open",
    verified: false,
    type: "On-street parking",
    ownership: "public",
    pricePerHour: 20,
    priceNote: "₹20/hr, ₹100 max per day (MCD standard rate)",
    charging: false,
    connectorType: null,
    chargingSpeedKw: null,
    availability: null,
  },
  {
    id: "select-citywalk",
    name: "Select Citywalk, Saket",
    lat: 28.5286,
    lng: 77.2192,
    status: "full",
    verified: true,
    type: "Basement parking",
    ownership: "public",
    pricePerHour: 25,
    priceNote: "₹100 for the first 4 hrs, ₹20/hr after (mall tariff)",
    charging: true,
    connectorType: "CCS2 (DC fast)",
    chargingSpeedKw: 30,
    availability: null,
  },
  {
    id: "india-gate",
    name: "India Gate Lawns",
    lat: 28.6129,
    lng: 77.2295,
    status: "open",
    verified: true,
    type: "Surface lot",
    ownership: "public",
    pricePerHour: 0,
    priceNote: "Free — DDA-maintained public lawns",
    charging: false,
    connectorType: null,
    chargingSpeedKw: null,
    availability: null,
  },
  {
    id: "karol-bagh",
    name: "Karol Bagh Market",
    lat: 28.6519,
    lng: 77.1909,
    status: "unknown",
    verified: false,
    type: "On-street parking",
    ownership: "public",
    pricePerHour: 40,
    priceNote: "₹40 for hour 1, rising to ₹70 by hour 5, ₹300 max/day (MCD premium site)",
    charging: false,
    connectorType: null,
    chargingSpeedKw: null,
    availability: null,
  },
  {
    id: "nehru-place",
    name: "Nehru Place",
    lat: 28.5487,
    lng: 77.2519,
    status: "limited",
    verified: true,
    type: "Multilevel parking",
    ownership: "public",
    pricePerHour: 30,
    priceNote: "≈₹30/hr (MCD multilevel site, commercial district rate)",
    charging: true,
    connectorType: "Type 2 (AC)",
    chargingSpeedKw: 7,
    availability: null,
  },
  {
    id: "lajpat-nagar",
    name: "Lajpat Nagar Central Market",
    lat: 28.5677,
    lng: 77.2431,
    status: "open",
    verified: false,
    type: "On-street parking",
    ownership: "public",
    pricePerHour: 20,
    priceNote: "₹20/hr, ₹100 max per day (MCD standard rate)",
    charging: false,
    connectorType: null,
    chargingSpeedKw: null,
    availability: null,
  },
  {
    id: "panchsheel-driveway",
    name: "Panchsheel Enclave — Resident Driveway",
    lat: 28.5525,
    lng: 77.2001,
    status: "open",
    verified: true,
    type: "Private driveway",
    ownership: "private",
    pricePerHour: 15,
    priceNote: "₹15/hr — set by the owner",
    charging: false,
    connectorType: null,
    chargingSpeedKw: null,
    // Owner is out at work on weekdays — driveway is free to rent then.
    availability: { days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" },
  },
  {
    id: "vasant-vihar-society",
    name: "Vasant Vihar — Society Slot",
    lat: 28.559,
    lng: 77.1591,
    status: "open",
    verified: false,
    type: "Private society parking",
    ownership: "private",
    pricePerHour: 25,
    priceNote: "₹25/hr — set by the owner",
    charging: true,
    connectorType: "Bharat AC-001",
    chargingSpeedKw: 3.3,
    // Spare society slot, rented out most of the day, every day.
    availability: { days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "22:00" },
  },

  // Additional public spots across Delhi — same tariff categories as above,
  // applied to more real neighborhoods so the map isn't just central Delhi.
  { id: "chandni-chowk", name: "Chandni Chowk", lat: 28.6506, lng: 77.2303, status: "open", verified: true, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "red-fort", name: "Red Fort", lat: 28.6559, lng: 77.2415, status: "limited", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 20, priceNote: MONUMENT_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "paharganj", name: "Paharganj Main Bazaar", lat: 28.6448, lng: 77.2167, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "ito", name: "ITO", lat: 28.6289, lng: 77.241, status: "limited", verified: true, type: "Multilevel parking", ownership: "public", pricePerHour: 30, priceNote: MCD_MULTILEVEL_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "palika-bazaar", name: "Palika Bazaar, Connaught Place", lat: 28.6321, lng: 77.2197, status: "full", verified: true, type: "Basement parking", ownership: "public", pricePerHour: 25, priceNote: MALL_NOTE, charging: true, connectorType: "Type 2 (AC)", chargingSpeedKw: 7, availability: null },
  { id: "jama-masjid", name: "Jama Masjid", lat: 28.6507, lng: 77.2334, status: "unknown", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "kamla-nagar", name: "Kamla Nagar Market", lat: 28.6813, lng: 77.2077, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "sadar-bazaar", name: "Sadar Bazaar", lat: 28.6608, lng: 77.2107, status: "limited", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "gtb-nagar", name: "GTB Nagar Market", lat: 28.6997, lng: 77.2065, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "model-town", name: "Model Town Market", lat: 28.7115, lng: 77.1912, status: "open", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "civil-lines", name: "Civil Lines", lat: 28.6775, lng: 77.2213, status: "unknown", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "green-park", name: "Green Park Market", lat: 28.5588, lng: 77.2064, status: "open", verified: true, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "gk1-m-block", name: "GK-1 M Block Market", lat: 28.5622, lng: 77.2416, status: "limited", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 30, priceNote: MCD_MULTILEVEL_NOTE, charging: true, connectorType: "Type 2 (AC)", chargingSpeedKw: 7, availability: null },
  { id: "gk2-market", name: "GK-2 Market", lat: 28.5495, lng: 77.2493, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "saket-district-centre", name: "Saket District Centre", lat: 28.5232, lng: 77.2168, status: "full", verified: true, type: "Multilevel parking", ownership: "public", pricePerHour: 30, priceNote: MCD_MULTILEVEL_NOTE, charging: true, connectorType: "CCS2 (DC fast)", chargingSpeedKw: 30, availability: null },
  { id: "malviya-nagar", name: "Malviya Nagar Market", lat: 28.5307, lng: 77.2093, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "sarojini-nagar", name: "Sarojini Nagar Market", lat: 28.5768, lng: 77.1963, status: "limited", verified: true, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "defence-colony", name: "Defence Colony Market", lat: 28.5735, lng: 77.232, status: "open", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "vasant-kunj-mall", name: "Vasant Kunj — Ambience Mall", lat: 28.5245, lng: 77.159, status: "full", verified: true, type: "Basement parking", ownership: "public", pricePerHour: 25, priceNote: MALL_NOTE, charging: true, connectorType: "CCS2 (DC fast)", chargingSpeedKw: 30, availability: null },
  { id: "chattarpur", name: "Chattarpur", lat: 28.4989, lng: 77.175, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "qutub-minar", name: "Qutub Minar", lat: 28.5245, lng: 77.1855, status: "open", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 20, priceNote: MONUMENT_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "laxmi-nagar", name: "Laxmi Nagar Market", lat: 28.6345, lng: 77.2767, status: "limited", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "preet-vihar", name: "Preet Vihar Market", lat: 28.6353, lng: 77.2949, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "mayur-vihar-1", name: "Mayur Vihar Phase 1 Market", lat: 28.6096, lng: 77.2934, status: "open", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "anand-vihar-isbt", name: "Anand Vihar ISBT", lat: 28.6469, lng: 77.3152, status: "unknown", verified: false, type: "Multilevel parking", ownership: "public", pricePerHour: 30, priceNote: MCD_MULTILEVEL_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "yamuna-bank", name: "Yamuna Bank", lat: 28.6169, lng: 77.274, status: "open", verified: false, type: "Surface lot", ownership: "public", pricePerHour: 0, priceNote: FREE_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "rajouri-garden", name: "Rajouri Garden Market", lat: 28.6467, lng: 77.1201, status: "full", verified: true, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "janakpuri-district-centre", name: "Janakpuri District Centre", lat: 28.6219, lng: 77.0895, status: "limited", verified: true, type: "Multilevel parking", ownership: "public", pricePerHour: 30, priceNote: MCD_MULTILEVEL_NOTE, charging: true, connectorType: "Type 2 (AC)", chargingSpeedKw: 7, availability: null },
  { id: "tilak-nagar", name: "Tilak Nagar Market", lat: 28.6414, lng: 77.0917, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "punjabi-bagh-market", name: "Punjabi Bagh Market", lat: 28.6692, lng: 77.1315, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "paschim-vihar", name: "Paschim Vihar Market", lat: 28.6692, lng: 77.101, status: "unknown", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "dwarka-sector-21", name: "Dwarka Sector 21", lat: 28.5522, lng: 77.0589, status: "open", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "dwarka-sector-10-market", name: "Dwarka Sector 10 Market", lat: 28.5921, lng: 77.0498, status: "limited", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "pitampura-nsp", name: "Pitampura — Netaji Subhash Place", lat: 28.6984, lng: 77.15, status: "full", verified: true, type: "Multilevel parking", ownership: "public", pricePerHour: 30, priceNote: MCD_MULTILEVEL_NOTE, charging: true, connectorType: "Type 2 (AC)", chargingSpeedKw: 7, availability: null },
  { id: "rohini-sector-7", name: "Rohini Sector 7 Market", lat: 28.7136, lng: 77.1188, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "shalimar-bagh-market", name: "Shalimar Bagh Market", lat: 28.7145, lng: 77.1642, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "ashok-vihar", name: "Ashok Vihar Market", lat: 28.695, lng: 77.181, status: "limited", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "yamuna-vihar", name: "Yamuna Vihar Market", lat: 28.6935, lng: 77.2711, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "shahdara-market", name: "Shahdara Market", lat: 28.6692, lng: 77.2897, status: "unknown", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "dilli-haat-ina", name: "Dilli Haat, INA", lat: 28.5732, lng: 77.2069, status: "open", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 30, priceNote: MCD_MULTILEVEL_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "aiims", name: "AIIMS Area", lat: 28.5672, lng: 77.21, status: "full", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "chanakyapuri", name: "Chanakyapuri", lat: 28.5933, lng: 77.1885, status: "open", verified: true, type: "Surface lot", ownership: "public", pricePerHour: 0, priceNote: FREE_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "rk-puram-sector-5", name: "R K Puram Sector 5 Market", lat: 28.565, lng: 77.177, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "vikaspuri-district-centre", name: "Vikaspuri District Centre", lat: 28.6377, lng: 77.0688, status: "limited", verified: true, type: "Multilevel parking", ownership: "public", pricePerHour: 30, priceNote: MCD_MULTILEVEL_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },
  { id: "uttam-nagar", name: "Uttam Nagar Market", lat: 28.6193, lng: 77.0587, status: "open", verified: false, type: "On-street parking", ownership: "public", pricePerHour: 20, priceNote: MCD_STANDARD_NOTE, charging: false, connectorType: null, chargingSpeedKw: null, availability: null },

  // Additional private (owner-rented) listings, each with its own hours.
  { id: "gk2-driveway", name: "GK-2 — Resident Driveway", lat: 28.5502, lng: 77.2465, status: "open", verified: true, type: "Private driveway", ownership: "private", pricePerHour: 15, priceNote: "₹15/hr — set by the owner", charging: false, connectorType: null, chargingSpeedKw: null, availability: { days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" } },
  { id: "vasant-kunj-society", name: "Vasant Kunj — Society Slot", lat: 28.527, lng: 77.158, status: "open", verified: false, type: "Private society parking", ownership: "private", pricePerHour: 20, priceNote: "₹20/hr — set by the owner", charging: false, connectorType: null, chargingSpeedKw: null, availability: { days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "22:00" } },
  { id: "rajouri-garden-driveway", name: "Rajouri Garden — Resident Driveway", lat: 28.648, lng: 77.1225, status: "open", verified: true, type: "Private driveway", ownership: "private", pricePerHour: 15, priceNote: "₹15/hr — set by the owner", charging: false, connectorType: null, chargingSpeedKw: null, availability: { days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" } },
  { id: "dwarka-sector-10-society", name: "Dwarka Sector 10 — Society Slot", lat: 28.591, lng: 77.051, status: "limited", verified: false, type: "Private society parking", ownership: "private", pricePerHour: 20, priceNote: "₹20/hr — set by the owner", charging: true, connectorType: "Bharat AC-001", chargingSpeedKw: 3.3, availability: { days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "22:00" } },
  { id: "rohini-sector-7-driveway", name: "Rohini Sector 7 — Resident Driveway", lat: 28.714, lng: 77.12, status: "open", verified: false, type: "Private driveway", ownership: "private", pricePerHour: 15, priceNote: "₹15/hr — set by the owner", charging: false, connectorType: null, chargingSpeedKw: null, availability: { days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" } },
  { id: "safdarjung-enclave-society", name: "Safdarjung Enclave — Society Slot", lat: 28.565, lng: 77.195, status: "open", verified: true, type: "Private society parking", ownership: "private", pricePerHour: 25, priceNote: "₹25/hr — set by the owner", charging: true, connectorType: "Bharat AC-001", chargingSpeedKw: 3.3, availability: { days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "22:00" } },
  { id: "punjabi-bagh-driveway", name: "Punjabi Bagh — Resident Driveway", lat: 28.67, lng: 77.133, status: "open", verified: false, type: "Private driveway", ownership: "private", pricePerHour: 15, priceNote: "₹15/hr — set by the owner", charging: false, connectorType: null, chargingSpeedKw: null, availability: { days: [1, 2, 3, 4, 5], start: "09:00", end: "18:00" } },
  { id: "shalimar-bagh-society", name: "Shalimar Bagh — Society Slot", lat: 28.715, lng: 77.165, status: "open", verified: true, type: "Private society parking", ownership: "private", pricePerHour: 25, priceNote: "₹25/hr — set by the owner", charging: true, connectorType: "Type 2 (AC)", chargingSpeedKw: 7, availability: { days: [0, 1, 2, 3, 4, 5, 6], start: "08:00", end: "22:00" } },
];
