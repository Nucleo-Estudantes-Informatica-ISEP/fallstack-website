/** A morning or afternoon period offered on the scanner page. */
export type AttendanceSessionDto = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  /** ISO timestamps of the session window. */
  start: string;
  end: string;
  dayTitle: string;
};
