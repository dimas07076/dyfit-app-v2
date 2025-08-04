/**
 * Formats a date string for use in HTML date input fields
 * Handles various date formats and ensures output is always YYYY-MM-DD
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
    // First, try to create a Date object from the input
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('formatDateForInput: Invalid date string:', dateString);
      return '';
    }

    // Extract year, month, and day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');

    // Return in YYYY-MM-DD format
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('formatDateForInput: Error formatting date string:', dateString, error);
    return '';
  }
}