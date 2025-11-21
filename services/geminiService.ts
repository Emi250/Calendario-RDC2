import { GoogleGenAI } from "@google/genai";
import { AvailabilityData, DayStatus } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a natural language summary of available dates for a specific month.
 */
export const generateMonthlyReport = async (
  currentDate: Date,
  availability: AvailabilityData,
  departments: { id: string; name: string }[]
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: No se pudo configurar la API Key de IA.";

  const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Calculate days in the specific month being viewed
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get 'today' at midnight to filter past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pre-process data to text to help the AI understand the raw calendar state
  let dataContext = "";

  departments.forEach(dept => {
    dataContext += `\n${dept.name}:\n`;
    const freeDays: number[] = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const checkDate = new Date(year, month, d);

      // If the date is in the past, it is effectively NOT free for reservation
      if (checkDate < today) {
        continue;
      }

      // Default is FREE if not explicitly blocked in the data
      const status = availability[dept.id]?.[dateStr] || DayStatus.FREE;
      if (status === DayStatus.FREE) {
        freeDays.push(d);
      }
    }
    
    if (freeDays.length === 0) {
      dataContext += "  Estado: Completamente ocupado o fechas ya pasadas (0 días libres para reservar).\n";
    } else {
      dataContext += `  Días libres disponibles (números de día): ${freeDays.join(', ')}\n`;
    }
  });

  const prompt = `
    Actúa como un asistente de reservas inteligente para el complejo "El Refugio del Corazón".
    
    CONTEXTO:
    El usuario está viendo el calendario de: ${monthName}.
    Tu objetivo es facilitar la lectura de la disponibilidad resumiendo los días libres FUTUROS en rangos de fechas.
    
    DATOS (Días libres y reservables por departamento):
    ${dataContext}

    INSTRUCCIONES:
    1. Genera un resumen departamento por departamento.
    2. Agrupa los días consecutivos en rangos legibles (ej: "del 14 al 26", "del 1 al 5 y el 20").
    3. Si un departamento está lleno o todas sus fechas ya pasaron, indícalo claramente.
    4. Usa un tono profesional, cálido y conciso.
    5. NO uses formato Markdown como negritas (**texto**) o cursivas (*texto*). La salida será texto plano. Evita los asteriscos.
    6. Usa mayúsculas para los nombres de los departamentos para separarlos visualmente.
    
    FORMATO DE RESPUESTA REQUERIDO (TEXTO PLANO):
    
    DEPARTAMENTO 1
    ------------------
    • [Resumen de fechas libres]
    
    DEPARTAMENTO 2
    ------------------
    • [Resumen de fechas libres]
    
    (etc...)
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No se pudo generar el resumen.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Lo siento, hubo un error al conectar con el servicio de inteligencia artificial. Por favor intente nuevamente.";
  }
};