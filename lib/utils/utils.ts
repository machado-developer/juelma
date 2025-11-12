import { clsx, type ClassValue } from "clsx"
import { differenceInMinutes } from "date-fns"
import { format, toZonedTime } from "date-fns-tz"
import { ptBR } from "date-fns/locale"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("AOA", {
    style: "currency",
    currency: "AOA",
  }).format(amount)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("AOA", {
    year: "numeric",
    month: "long",
    day: "numeric",

  }).format(new Date(date))
}

export function formatHour(date: Date): string {
  return new Intl.DateTimeFormat("AOA", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).format(new Date(date))
}

// Converte uma data UTC para string local (ex: 2025-04-07 14:30)
export function formatDateTimeToLocal(date: Date) {
  const zoned = toZonedTime(date, TIMEZONE);
  return format(zoned, "yyyy-MM-dd HH:mm", { timeZone: TIMEZONE });
}

// Exemplo: mostra só a hora local
export function formatTimeToLocal(date: Date) {
  const zoned = toZonedTime(date, TIMEZONE);
  return format(zoned, "HH:mm", { timeZone: TIMEZONE });
}

// Exemplo: mostra só a data local
export function formatDateToLocal(date: Date) {
  const zoned = toZonedTime(date, TIMEZONE);
  return format(zoned, "yyyy-MM-dd", { timeZone: TIMEZONE });
}




export function formatarDisponibilidade(startTime: string | Date, endTime: string | Date): string {
  console.log("DATAS", startTime, endTime);
  
    const start = new Date(startTime);
    const end = new Date(endTime);

    const dia = format(start, "d", { locale: ptBR });
    const semana = format(start, "EEEE", { locale: ptBR }); // força o plural
    const ano = format(start, "yyyy", { locale: ptBR });
    const horaInicio = format(start, "HH'h'mm", { locale: ptBR });
    const horaFim = format(end, "HH'h'mm", { locale: ptBR });

    const duracaoMin = differenceInMinutes(end, start);
    const horas = Math.floor(duracaoMin / 60);
    const minutos = duracaoMin % 60;

    const duracao =
        (horas ? `${horas}h` : "") + (horas && minutos ? "" : "") + (minutos ? `${minutos}min` : "");

    return `dia ${dia} ${semana}, de ${ano} das ${horaInicio} até as ${horaFim} – duração de ${duracao}`;
}



export function generatePaymentCode(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, ""); // AAAAMMDD
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 chars

  return `PAY-${datePart}-${randomPart}`;
}
