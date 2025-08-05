/**
 * Formats a date string for use in HTML date input fields
 * Handles various date formats and ensures output is always YYYY-MM-DD
 * Fixes timezone issues by treating date-only strings as local dates
 * 
 * @param dateString - The date string to format (can be ISO format, date-only, etc.)
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if invalid
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  // Return empty string for null, undefined, or empty strings
  if (!dateString || dateString.trim() === '') {
    return '';
  }

  try {
    const trimmedDate = dateString.trim();
    
    // Handle the case where dateString is already in YYYY-MM-DD format
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyRegex.test(trimmedDate)) {
      // If it's already in the correct format, just return it
      // This avoids timezone conversion issues for date-only strings
      return trimmedDate;
    }

    // For ISO strings with time (e.g., "2023-12-15T10:30:00Z"), 
    // extract just the date part to avoid timezone issues
    if (trimmedDate.includes('T')) {
      const datePart = trimmedDate.split('T')[0];
      if (dateOnlyRegex.test(datePart)) {
        return datePart;
      }
    }

    // For other formats, try to parse but use UTC methods to avoid timezone issues
    const date = new Date(trimmedDate);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('formatDateForInput: Invalid date string:', dateString);
      return '';
    }

    // Use UTC methods to avoid timezone conversion issues for date parsing
    // This ensures that a date like "1988-07-07" doesn't become "1988-07-06" 
    // in timezones behind UTC (like Brazil UTC-3)
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Return in YYYY-MM-DD format
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('formatDateForInput: Error formatting date string:', dateString, error);
    return '';
  }
}