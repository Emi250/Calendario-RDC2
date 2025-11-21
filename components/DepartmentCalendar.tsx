import React from 'react';
import { CalendarProps, DayStatus } from '../types';

const DAYS_OF_WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const DepartmentCalendar: React.FC<CalendarProps> = ({
  departmentId,
  departmentName,
  currentDate,
  availability,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to get number of days in month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  
  // Helper to get day of week for the 1st of the month (0=Mon, 6=Sun for our UI)
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay();
    // JS returns 0 for Sunday. We want 0 for Monday.
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: startDay }, (_, i) => i);

  // Get 'today' at midnight for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDayStatus = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availability[departmentId]?.[dateStr] || DayStatus.FREE;
  };

  return (
    <div className="flex flex-col items-center w-full">
      <h3 className="mb-6 text-2xl font-medium text-[#C5A059] tracking-wide text-center font-serif">
        {departmentName}
      </h3>

      {/* Container constrained to standard calendar width for readability, but fully responsive */}
      <div className="w-full max-w-sm mx-auto">
        
        {/* Grid Header */}
        <div className="grid grid-cols-7 mb-3">
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={i} className="text-center text-stone-400 text-xs sm:text-sm font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {blanksArray.map((_, i) => (
            <div key={`blank-${i}`} className="aspect-square" />
          ))}
          
          {daysArray.map((day) => {
            // Construct the specific date for this cell
            const cellDate = new Date(year, month, day);
            
            const status = getDayStatus(day);
            const isReserved = status === DayStatus.BLOCKED;
            const isPast = cellDate < today;

            let bgClass = 'bg-green-100 text-green-800'; // Default Free

            if (isPast) {
              bgClass = 'bg-stone-200 text-stone-400 cursor-not-allowed'; // Past/Disabled
            } else if (isReserved) {
              bgClass = 'bg-red-100 text-red-800'; // Reserved
            }

            return (
              <div
                key={day}
                className={`
                  aspect-square rounded-full flex items-center justify-center text-sm font-medium
                  ${bgClass}
                `}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};