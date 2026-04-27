/**
 * Composable that provides a formatDate function for Chinese locale date formatting.
 * Returns dates in the format: YYYY年M月D日 (e.g. 2026年4月27日)
 */
export function useFormatDate() {
  /**
   * Format a date value into a Chinese locale string.
   * @param {string | Date} d - The date value to format
   * @returns {string} Formatted date string like "2026年4月27日", or empty string if input is falsy
   */
  function formatDate(d) {
    if (!d) return ''
    const date = new Date(d)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
  }

  return { formatDate }
}
