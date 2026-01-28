
import { ProcessingResult } from "../types";

/**
 * Valide si l'objet JSON respecte la structure métier requise
 */
export const validateAndParseJSON = (text: string): ProcessingResult => {
  try {
    const data = JSON.parse(text);
    
    if (!data.studentName || typeof data.studentName !== 'string') {
      throw new Error("Le champ 'studentName' est manquant ou invalide.");
    }
    
    if (!Array.isArray(data.sessions) || data.sessions.length === 0) {
      throw new Error("Le champ 'sessions' doit être un tableau non vide.");
    }

    // Validation de chaque session
    data.sessions.forEach((s: any, i: number) => {
      if (!s.date || !s.startTime || !s.endTime || !s.module || !s.trainer || typeof s.hours !== 'number') {
        throw new Error(`La session n°${i + 1} est incomplète (vérifiez date, horaires, module, intervenant et heures).`);
      }
    });

    return data as ProcessingResult;
  } catch (err: any) {
    throw new Error(err.message || "Le format JSON est invalide.");
  }
};
