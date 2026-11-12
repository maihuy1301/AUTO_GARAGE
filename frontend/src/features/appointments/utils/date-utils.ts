/**
 * Kiểm tra xem một chuỗi ngày giờ (ISO string) có thuộc ngày hôm nay theo múi giờ client không.
 */
export const isToday = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

