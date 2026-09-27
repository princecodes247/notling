export function validatePropertyValue(type: string, value: any): { isValid: boolean; errorMessage?: string } {
  if (value === undefined || value === null || value === '') {
    return { isValid: true };
  }

  const strVal = String(value).trim();
  if (!strVal) return { isValid: true };

  switch (type) {
    case 'number': {
      const isNum = !isNaN(Number(strVal)) && isFinite(Number(strVal));
      return {
        isValid: isNum,
        errorMessage: isNum ? undefined : 'Must be a valid number',
      };
    }
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(strVal);
      return {
        isValid,
        errorMessage: isValid ? undefined : 'Must be a valid email address (user@domain.com)',
      };
    }
    case 'url': {
      try {
        const urlToTest = strVal.startsWith('http://') || strVal.startsWith('https://') ? strVal : `https://${strVal}`;
        const urlObj = new URL(urlToTest);
        const isValid = Boolean(urlObj.hostname && urlObj.hostname.includes('.'));
        return {
          isValid,
          errorMessage: isValid ? undefined : 'Must be a valid web URL',
        };
      } catch {
        return {
          isValid: false,
          errorMessage: 'Must be a valid URL (e.g. https://example.com)',
        };
      }
    }
    case 'date': {
      const parsed = parseDateInput(strVal);
      const isValid = parsed !== null;
      return {
        isValid,
        errorMessage: isValid ? undefined : 'Must be a valid date (e.g. 2026-09-27, today, tomorrow)',
      };
    }
    default:
      return { isValid: true };
  }
}

export function parseDateInput(input: string): string | null {
  if (!input || !input.trim()) return '';
  const str = input.trim().toLowerCase();
  const now = new Date();

  if (str === 'today') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (str === 'tomorrow') {
    const tmr = new Date(now);
    tmr.setDate(now.getDate() + 1);
    const y = tmr.getFullYear();
    const m = String(tmr.getMonth() + 1).padStart(2, '0');
    const d = String(tmr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (str === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    const y = yest.getFullYear();
    const m = String(yest.getMonth() + 1).padStart(2, '0');
    const d = String(yest.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dateObj = new Date(input);
  if (!isNaN(dateObj.getTime())) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}
