/**
 * Indian Standard Time (IST) formatter helper
 */
export const formatToIndianDateTime = (timestamp: number | string | Date | undefined): string => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);

  return `${partMap.day} ${partMap.month.toUpperCase()} ${partMap.year} ${partMap.hour}:${partMap.minute}:${partMap.second}`;
};
