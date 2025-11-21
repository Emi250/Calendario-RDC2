export enum DayStatus {
  FREE = 'FREE',
  BLOCKED = 'BLOCKED'
}

export interface AvailabilityData {
  [departmentId: string]: {
    [dateString: string]: DayStatus;
  };
}

export interface CalendarProps {
  departmentId: string;
  departmentName: string;
  currentDate: Date;
  availability: AvailabilityData;
}