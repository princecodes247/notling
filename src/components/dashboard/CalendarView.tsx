import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: number; // day of month (1-31)
  time?: string;
  tagColor: 'amber' | 'blue' | 'purple' | 'neutral';
  location?: string;
}

const MAY_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Venue & Logistics Finalization', date: 2, time: '10:00 AM', tagColor: 'amber', location: 'Spring St Studios' },
  { id: '2', title: 'Curriculum Slide Deck Review', date: 3, time: '2:30 PM', tagColor: 'amber' },
  { id: '3', title: 'Speaker Outreach Deadline', date: 6, time: '5:00 PM', tagColor: 'blue' },
  { id: '4', title: 'Early-Bird Registration Launch', date: 9, time: '9:00 AM', tagColor: 'purple' },
  { id: '5', title: 'Agent Demo Environment Setup', date: 15, time: '11:00 AM', tagColor: 'neutral' },
  { id: '6', title: 'Staff Day-of Operations Walkthrough', date: 22, time: '3:00 PM', tagColor: 'neutral' },
  { id: '7', title: 'NYC Workshop Day 1', date: 28, time: '8:30 AM', tagColor: 'amber', location: 'Main Hall' },
  { id: '8', title: 'NYC Workshop Day 2 & Hackathon', date: 29, time: '9:00 AM', tagColor: 'amber', location: 'Main Hall' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC = () => {
  const [currentMonth] = useState('May 2026');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // May 2026 starts on Friday (index 5) with 31 days
  const startDayOffset = 5;
  const daysInMonth = 31;

  const getEventsForDay = (day: number) => {
    return MAY_EVENTS.filter((e) => e.date === day);
  };

  return (
    <div className="flex-1 w-full h-full bg-white flex flex-col overflow-hidden select-none font-sans">
      {/* 1. Calendar Header Toolbar */}
      <div className="h-14 px-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-sm text-neutral-900 px-1">
              {currentMonth}
            </span>
            <button
              type="button"
              className="p-1 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            className="text-xs px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg text-xs font-medium border border-neutral-200/60">
            <button
              type="button"
              className="px-2.5 py-1 rounded-md bg-white text-neutral-900 shadow-2xs"
            >
              Month
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded-md text-neutral-500 hover:text-neutral-900"
            >
              Week
            </button>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
        </div>
      </div>

      {/* 2. Days of the Week Header */}
      <div className="grid grid-cols-7 border-b border-neutral-100 text-center text-[11px] font-semibold text-neutral-400 py-2.5 bg-neutral-50/50 shrink-0">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* 3. Calendar Day Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto min-h-[450px]">
        {/* Leading empty cells for previous month */}
        {Array.from({ length: startDayOffset }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="border-r border-b border-neutral-100 p-2 bg-neutral-50/30 text-[11px] text-neutral-300"
          >
            {26 + i}
          </div>
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dayEvents = getEventsForDay(day);
          const isToday = day === 3;

          return (
            <div
              key={`day-${day}`}
              className={`border-r border-b border-neutral-100 p-1.5 sm:p-2.5 flex flex-col justify-between hover:bg-neutral-50/70 transition-colors ${
                isToday ? 'bg-amber-50/30' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                    isToday
                      ? 'bg-amber-500 text-white font-bold'
                      : 'text-neutral-700'
                  }`}
                >
                  {day}
                </span>
              </div>

              {/* Events in day */}
              <div className="flex flex-col gap-1 mt-1 overflow-hidden">
                {dayEvents.map((evt) => {
                  const tagStyles = {
                    amber: 'bg-amber-100 text-amber-900 border-amber-200/80',
                    blue: 'bg-blue-100 text-blue-900 border-blue-200/80',
                    purple: 'bg-purple-100 text-purple-900 border-purple-200/80',
                    neutral: 'bg-neutral-100 text-neutral-800 border-neutral-200/80',
                  }[evt.tagColor];

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`px-1.5 py-0.5 rounded text-[10px] truncate font-medium border cursor-pointer hover:shadow-2xs transition-all ${tagStyles}`}
                    >
                      {evt.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Details Drawer/Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-2xs">
          <div className="w-full max-w-sm bg-white rounded-lg border border-neutral-200 shadow-xl p-5 flex flex-col gap-3 font-sans">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Event Milestone
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-xs text-neutral-400 hover:text-neutral-700 px-1.5 py-0.5 rounded hover:bg-neutral-100"
              >
                ✕
              </button>
            </div>

            <h4 className="text-base font-semibold text-neutral-900">{selectedEvent.title}</h4>

            <div className="flex flex-col gap-1.5 text-xs text-neutral-600 pt-1">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>May {selectedEvent.date}, 2026 at {selectedEvent.time || 'All day'}</span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
