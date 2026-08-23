export function parseBirthdate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function ageFromDate(birthdate: Date, today = new Date()): number {
  let age = today.getUTCFullYear() - birthdate.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birthdate.getUTCMonth() ||
    (today.getUTCMonth() === birthdate.getUTCMonth() &&
      today.getUTCDate() < birthdate.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

export function birthdateError(value: string): string | null {
  const date = parseBirthdate(value);
  if (!date) return 'Enter a real date in YYYY-MM-DD format.';
  const age = ageFromDate(date);
  if (age < 18) return 'Milte is only for people 18 and over.';
  if (age > 99) return 'Please check the year you entered.';
  return null;
}
