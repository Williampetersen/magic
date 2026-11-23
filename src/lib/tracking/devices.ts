/* Phone model names. Pure data, used when a visit is recorded and when it is shown. */

/** Apple hardware ids, as the Instagram app sends them: "iPhone14,5". */
const IPHONE_MODELS: Record<string, string> = {
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  "iPhone12,8": "iPhone SE (2nd gen)",
  "iPhone13,1": "iPhone 12 mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone14,4": "iPhone 13 mini",
  "iPhone14,5": "iPhone 13",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,6": "iPhone SE (3rd gen)",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",
  "iPhone17,1": "iPhone 16 Pro",
  "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,5": "iPhone 16e",
  "iPhone18,3": "iPhone 17",
  "iPhone18,4": "iPhone Air",
  "iPhone18,1": "iPhone 17 Pro",
  "iPhone18,2": "iPhone 17 Pro Max",
  "iPhone18,5": "iPhone 17e",
};

/** "iPhone14,5" becomes "iPhone 13". Null for an id that is not in the list yet. */
export const iphoneName = (id: string) => IPHONE_MODELS[id] ?? null;

/** Samsung sends a product code. These are the common recent phones. */
const GALAXY_MODELS: Record<string, string> = {
  "SM-S938": "Galaxy S25 Ultra",
  "SM-S936": "Galaxy S25+",
  "SM-S931": "Galaxy S25",
  "SM-S928": "Galaxy S24 Ultra",
  "SM-S926": "Galaxy S24+",
  "SM-S921": "Galaxy S24",
  "SM-S918": "Galaxy S23 Ultra",
  "SM-S916": "Galaxy S23+",
  "SM-S911": "Galaxy S23",
  "SM-S908": "Galaxy S22 Ultra",
  "SM-S906": "Galaxy S22+",
  "SM-S901": "Galaxy S22",
  "SM-G998": "Galaxy S21 Ultra",
  "SM-G996": "Galaxy S21+",
  "SM-G991": "Galaxy S21",
  "SM-A566": "Galaxy A56",
  "SM-A556": "Galaxy A55",
  "SM-A546": "Galaxy A54",
  "SM-A536": "Galaxy A53",
  "SM-A528": "Galaxy A52s",
  "SM-A366": "Galaxy A36",
  "SM-A356": "Galaxy A35",
  "SM-A346": "Galaxy A34",
  "SM-A256": "Galaxy A25",
  "SM-A166": "Galaxy A16",
  "SM-A156": "Galaxy A15",
};

/** "SM-S918B" becomes "Galaxy S23 Ultra". Null for a code that is not in the list. */
export const galaxyName = (model: string) => GALAXY_MODELS[model.slice(0, 7)] ?? null;

/**
 * Chrome on Android no longer sends the real phone: every phone is "K".
 * Stored by earlier versions as the model, so it is never shown.
 */
export const PLACEHOLDER_MODEL = "K";

/**
 * The model as it should be shown. Also repairs values stored earlier:
 * "iPhone (iPhone18,2)" becomes "iPhone 17 Pro Max" once the id is in the list,
 * and the placeholder "K" becomes null.
 */
export function displayModel(stored: string | null | undefined) {
  if (!stored || stored === PLACEHOLDER_MODEL) return null;
  const id = stored.match(/\((iP(?:hone|ad)\d+,\d+)\)$/)?.[1];
  return (id && iphoneName(id)) || stored;
}
