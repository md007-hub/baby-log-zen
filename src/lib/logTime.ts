import { z } from "zod";

export function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const localTimestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).transform((value, ctx) => {
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  if (year === undefined || month === undefined || day === undefined || hour === undefined || minute === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a valid date and time" });
    return z.NEVER;
  }
  const date = new Date(year, month - 1, day, hour, minute);
  if (localDateTime(date) !== value) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a valid date and time" });
    return z.NEVER;
  }
  return date.getTime();
});

export function parseLocal(value: string) {
  const result = localTimestamp.safeParse(value);
  return result.success ? result.data : NaN;
}

export function entryTimestamp(value: string) {
  const timestamp = value ? parseLocal(value) : Date.now();
  return z.number().finite().min(new Date(2000, 0, 1).getTime()).max(Date.now()).parse(timestamp);
}