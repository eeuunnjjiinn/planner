import React from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function CalendarPanel({ selectedDate, onChangeDate }) {
  return (
    <div className="calendar-wrap">
      <Calendar
        value={selectedDate}
        calendarType="gregory"
        onChange={(value) => {
          // value가 Date 또는 [Date, Date]로 올 수 있어서 방어
          const next = Array.isArray(value) ? value[0] : value;

          // 여기서 MainPage로 전달
          if (typeof onChangeDate === "function") onChangeDate(next);
        }}
      />
    </div>
  );
}
