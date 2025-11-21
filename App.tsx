import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Sparkles, X, Bot } from 'lucide-react';
import { DepartmentCalendar } from './components/DepartmentCalendar';
import { AvailabilityData, DayStatus } from './types';
import { fetchIcalAvailability } from './services/icalService';
import { generateMonthlyReport } from './services/geminiService';

const DEPARTMENTS = [
  { id: 'dept-1', name: 'Departamento 1' },
  { id: 'dept-2', name: 'Departamento 2' },
  { id: 'dept-3', name: 'Departamento 3' },
  { id: 'dept-4', name: 'Departamento 4' },
];

// iCal URLs for each department
const DEPT_1_ICAL_URL = "https://ical.booking.com/v1/export?t=1c57600d-22c8-4603-8b8c-bdb585fb133e";
const DEPT_2_ICAL_URL = "https://ical.booking.com/v1/export?t=f0e90003-a4e2-4533-803c-93a5f7dab697";
const DEPT_3_ICAL_URL = "https://ical.booking.com/v1/export?t=5ed20a04-f111-4b6e-a21e-f88fa255aa2c";
const DEPT_4_ICAL_URL = "https://ical.booking.com/v1/export?t=d8375e17-eb2c-45d7-be64-bca5d121b903";

const App: React.FC = () => {
  // Initialize with current date to show the current month on load
  const [currentDate, setCurrentDate] = useState(() => new Date());
  
  const [availability, setAvailability] = useState<AvailabilityData>(() => {
    const saved = localStorage.getItem('calendar_availability');
    return saved ? JSON.parse(saved) : {};
  });

  const [isSyncing, setIsSyncing] = useState(false);
  
  // AI Summary State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Persist availability changes
  useEffect(() => {
    localStorage.setItem('calendar_availability', JSON.stringify(availability));
  }, [availability]);

  // Sync Calendars function
  const syncCalendars = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Fetch all iCals in parallel
      const [ical1, ical2, ical3, ical4] = await Promise.all([
        fetchIcalAvailability(DEPT_1_ICAL_URL),
        fetchIcalAvailability(DEPT_2_ICAL_URL),
        fetchIcalAvailability(DEPT_3_ICAL_URL),
        fetchIcalAvailability(DEPT_4_ICAL_URL)
      ]);

      setAvailability(prev => {
        const newData = { ...prev };

        const mergeData = (deptId: string, icalData: Record<string, DayStatus>) => {
          if (!newData[deptId]) newData[deptId] = {};
          
          // Clear existing blocked dates to allow updates (e.g. cancellations)
          // We re-build the blocked dates based entirely on the iCal feed.
          newData[deptId] = {};

          Object.entries(icalData).forEach(([date, status]) => {
            if (status === DayStatus.BLOCKED) {
              newData[deptId][date] = DayStatus.BLOCKED;
            }
          });
        };

        mergeData('dept-1', ical1);
        mergeData('dept-2', ical2);
        mergeData('dept-3', ical3);
        mergeData('dept-4', ical4);

        return newData;
      });
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial sync and periodic sync
  useEffect(() => {
    syncCalendars();
    // Sync every 60 seconds
    const interval = setInterval(syncCalendars, 60000);
    return () => clearInterval(interval);
  }, [syncCalendars]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGenerateSummary = async () => {
    setShowSummaryModal(true);
    setIsGeneratingSummary(true);
    setSummaryText("");
    
    const report = await generateMonthlyReport(currentDate, availability, DEPARTMENTS);
    
    setSummaryText(report);
    setIsGeneratingSummary(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#44403C] flex flex-col font-sans">
      <header className="w-full py-6 px-4 flex flex-col items-center justify-center">
        <h1 className="text-3xl md:text-4xl font-serif text-[#C5A059] tracking-wide mb-6 text-center">
          El Refugio del Corazón
        </h1>
        
        <div className="flex items-center gap-8 mb-6">
          <button 
            onClick={handlePrevMonth}
            className="p-2 rounded-full hover:bg-stone-200 text-[#C5A059] transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={32} />
          </button>
          <h2 className="text-2xl font-medium capitalize min-w-[200px] text-center">
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <button 
            onClick={handleNextMonth}
            className="p-2 rounded-full hover:bg-stone-200 text-[#C5A059] transition-colors"
            aria-label="Siguiente mes"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm font-medium mb-4 px-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-100 border border-red-200"></div>
            <span className="text-stone-600">Reservado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-100 border border-green-200"></div>
            <span className="text-stone-600">Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-stone-200 border border-stone-300"></div>
            <span className="text-stone-400">No disponible</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-2 md:px-6 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {DEPARTMENTS.map(dept => (
            <DepartmentCalendar
              key={dept.id}
              departmentId={dept.id}
              departmentName={dept.name}
              currentDate={currentDate}
              availability={availability}
            />
          ))}
        </div>
      </main>

      <footer className="py-6 px-4 text-center text-stone-400 text-sm flex flex-col md:flex-row justify-center items-center gap-4 pb-10">
        <button 
          onClick={syncCalendars}
          disabled={isSyncing}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 rounded-full shadow-sm hover:bg-stone-50 transition-all disabled:opacity-50 text-stone-600"
        >
          <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Sincronizando..." : "Actualizar Calendarios"}
        </button>
        
        <button 
          onClick={handleGenerateSummary}
          className="flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-white rounded-full shadow-sm hover:bg-[#b08d4d] transition-all"
        >
          <Bot size={20} />
          <span>Listado de fechas libres de {currentDate.toLocaleDateString('es-ES', { month: 'long' })}</span>
        </button>
      </footer>

      {/* AI Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FAF9F6] rounded-2xl shadow-2xl max-w-2xl w-full border border-[#C5A059]/20 relative flex flex-col max-h-[85vh] sm:max-h-[80vh]">
            
            {/* Fixed Header */}
            <div className="flex-none flex justify-between items-center p-6 border-b border-stone-200 bg-[#FAF9F6] rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Sparkles className="text-[#C5A059]" size={24} />
                <h3 className="text-xl md:text-2xl font-serif text-[#C5A059]">
                  Disponibilidad: {currentDate.toLocaleDateString('es-ES', { month: 'long' })}
                </h3>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              {isGeneratingSummary ? (
                <div className="h-full flex flex-col items-center justify-center py-8 space-y-4 text-[#C5A059]">
                  <Sparkles className="animate-pulse w-10 h-10" />
                  <span className="text-lg font-medium animate-pulse">Analizando fechas disponibles...</span>
                </div>
              ) : (
                <div className="prose prose-stone max-w-none">
                  <div className="whitespace-pre-wrap text-base md:text-lg leading-loose text-stone-700 font-medium font-sans">
                    {summaryText}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            {!isGeneratingSummary && (
               <div className="flex-none p-6 border-t border-stone-200 bg-[#FAF9F6] rounded-b-2xl flex justify-end">
                 <button
                   onClick={() => setShowSummaryModal(false)}
                   className="w-full sm:w-auto px-8 py-3 bg-[#C5A059] hover:bg-[#b08d4d] text-white rounded-xl transition-colors font-medium shadow-sm"
                 >
                   Cerrar Resumen
                 </button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;