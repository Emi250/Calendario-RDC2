import { DayStatus } from "../types";

// Using a proxy is necessary for client-side fetching of external iCal feeds due to CORS restrictions in browsers.
// In a production environment, this should typically be handled by a backend.
// We use corsproxy.io as it tends to be more reliable for direct file streams than allorigins.
const PROXY_URL = "https://corsproxy.io/?";

/**
 * Fetches iCal data from a URL and parses it into a map of blocked dates.
 */
export const fetchIcalAvailability = async (icalUrl: string): Promise<Record<string, DayStatus>> => {
  try {
    // corsproxy.io expects the target URL as a query parameter. 
    // Encoding ensures special characters in the URL don't break the proxy request.
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(icalUrl)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.statusText}`);
    }
    const text = await response.text();
    return parseIcalData(text);
  } catch (error) {
    console.error("Error fetching iCal data:", error);
    return {};
  }
};

const parseIcalData = (data: string): Record<string, DayStatus> => {
  const blockedDates: Record<string, DayStatus> = {};
  const lines = data.split(/\r\n|\n|\r/);
  
  let inEvent = false;
  let dtStart: string | null = null;
  let dtEnd: string | null = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      dtStart = null;
      dtEnd = null;
    } else if (line.startsWith("END:VEVENT")) {
      inEvent = false;
      if (dtStart && dtEnd) {
        const range = getDateRange(dtStart, dtEnd);
        range.forEach(date => {
          blockedDates[date] = DayStatus.BLOCKED;
        });
      } else if (dtStart) {
        // Fallback for single day event if no end date provided
        const dateStr = parseIcalDate(dtStart);
        if (dateStr) blockedDates[dateStr] = DayStatus.BLOCKED;
      }
    } else if (inEvent) {
      // Handle both standard property format and potential parameter formats
      if (line.startsWith("DTSTART")) dtStart = getPropertyValue(line);
      if (line.startsWith("DTEND")) dtEnd = getPropertyValue(line);
    }
  }
  
  return blockedDates;
};

const getPropertyValue = (line: string): string => {
  // Handles "DTSTART;VALUE=DATE:20230101" or "DTSTART:20230101T120000Z"
  // We simply take everything after the first colon
  const parts = line.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : "";
};

const parseIcalDate = (icalDate: string): string | null => {
  // Cleans standard iCal date formats to YYYY-MM-DD
  // Examples: "20230101" or "20230101T120000Z"
  const cleanDate = icalDate.split("T")[0].replace(/[^0-9]/g, ""); 
  if (cleanDate.length !== 8) return null;
  
  const y = cleanDate.substring(0, 4);
  const m = cleanDate.substring(4, 6);
  const d = cleanDate.substring(6, 8);
  return `${y}-${m}-${d}`;
};

const getDateRange = (start: string, end: string): string[] => {
  const sStr = parseIcalDate(start);
  const eStr = parseIcalDate(end);
  
  if (!sStr || !eStr) return [];
  
  const dates: string[] = [];
  // We use UTC to avoid timezone shifts when calculating "next day"
  const current = new Date(sStr); 
  const last = new Date(eStr);
  
  // iCal end dates are exclusive (the morning of departure).
  // We iterate until current < last.
  while (current < last) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};