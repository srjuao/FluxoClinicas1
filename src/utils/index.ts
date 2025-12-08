export { validateCPF, formatCPF, cleanCPF } from "./cpf";

export const calculateAge = (
  birthDate: string | null | undefined
): string | number => {
  if (!birthDate) return "";
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * Formata uma data string (YYYY-MM-DD) para o formato brasileiro (DD/MM/YYYY)
 * Adiciona T12:00:00 para evitar o bug de timezone que pode retroceder o dia
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  // Adiciona T12:00:00 para evitar que a conversão de timezone mude o dia
  const dateWithTime = dateString.includes("T") ? dateString : `${dateString}T12:00:00`;
  return new Date(dateWithTime).toLocaleDateString("pt-BR");
};

/**
 * Cria um objeto Date seguro a partir de uma string de data (YYYY-MM-DD)
 * Evita o bug de timezone que pode retroceder o dia
 */
export const createSafeDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  const dateWithTime = dateString.includes("T") ? dateString : `${dateString}T12:00:00`;
  return new Date(dateWithTime);
};
