import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  label: string;
  activeTheme?: 'oled' | 'cosmic' | 'asgardian' | 'wakanda' | 'stark' | 'hydra';
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  activeTheme = 'oled',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current date or default to today
  const today = new Date();
  const parsedDate = value ? new Date(value) : null;

  const [viewYear, setViewYear] = useState(parsedDate ? parsedDate.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate ? parsedDate.getMonth() : today.getMonth());
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  const updatePopupPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popupWidth = 256;
    const viewportWidth = window.innerWidth;
    const style: React.CSSProperties = {};

    if (viewportWidth < 380) {
      const parentLeft = rect.left;
      const desiredLeft = (viewportWidth - Math.min(popupWidth, viewportWidth * 0.9)) / 2;
      style.left = `${desiredLeft - parentLeft}px`;
      style.right = 'auto';
      style.width = `${Math.min(popupWidth, viewportWidth * 0.9)}px`;
    } else {
      if (rect.left + popupWidth > viewportWidth) {
        style.right = '0px';
        style.left = 'auto';
      } else {
        style.left = '0px';
        style.right = 'auto';
      }
      style.width = `${popupWidth}px`;
    }
    setPopupStyle(style);
  };

  useEffect(() => {
    if (isOpen) {
      updatePopupPosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', updatePopupPosition);
    return () => window.removeEventListener('resize', updatePopupPosition);
  }, [isOpen]);

  // Close calendar dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  // Highlight color helper based on active theme
  const getThemeColors = () => {
    switch (activeTheme) {
      case 'cosmic':
        return {
          text: 'text-indigo-400',
          border: 'border-indigo-500/30 focus:border-indigo-500 hover:border-indigo-500/50',
          bg: 'bg-indigo-600 hover:bg-indigo-500',
          hoverBg: 'hover:bg-indigo-500/10 hover:text-indigo-300',
          textSelected: 'bg-indigo-600 text-white',
          todayBorder: 'border-indigo-500',
        };
      case 'asgardian':
        return {
          text: 'text-amber-400',
          border: 'border-amber-500/30 focus:border-amber-500 hover:border-amber-500/50',
          bg: 'bg-amber-600 hover:bg-amber-500',
          hoverBg: 'hover:bg-amber-500/10 hover:text-amber-300',
          textSelected: 'bg-amber-600 text-white',
          todayBorder: 'border-amber-500',
        };
      case 'wakanda':
        return {
          text: 'text-purple-400',
          border: 'border-purple-500/30 focus:border-purple-500 hover:border-purple-500/50',
          bg: 'bg-purple-600 hover:bg-purple-500',
          hoverBg: 'hover:bg-purple-500/10 hover:text-purple-300',
          textSelected: 'bg-purple-600 text-white',
          todayBorder: 'border-purple-500',
        };
      case 'stark':
        return {
          text: 'text-sky-400',
          border: 'border-sky-500/30 focus:border-sky-500 hover:border-sky-500/50',
          bg: 'bg-sky-600 hover:bg-sky-500',
          hoverBg: 'hover:bg-sky-500/10 hover:text-sky-300',
          textSelected: 'bg-sky-600 text-white',
          todayBorder: 'border-sky-500',
        };
      case 'hydra':
        return {
          text: 'text-red-400',
          border: 'border-red-500/30 focus:border-red-500 hover:border-red-500/50',
          bg: 'bg-red-600 hover:bg-red-500',
          hoverBg: 'hover:bg-red-500/10 hover:text-red-300',
          textSelected: 'bg-red-600 text-white',
          todayBorder: 'border-red-500',
        };
      default: // oled / marvel
        return {
          text: 'text-marvel',
          border: 'border-neutral-800 focus:border-marvel hover:border-neutral-700',
          bg: 'bg-red-600 hover:bg-red-500',
          hoverBg: 'hover:bg-red-500/10 hover:text-red-300',
          textSelected: 'bg-red-600 text-white',
          todayBorder: 'border-red-600',
        };
    }
  };

  const colors = getThemeColors();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const formattedMonth = (viewMonth + 1).toString().padStart(2, '0');
    const formattedDay = dayNum.toString().padStart(2, '0');
    onChange(`${viewYear}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const [y, m, d] = dateStr.split('-');
    const mName = monthNames[parseInt(m, 10) - 1].slice(0, 3);
    return `${mName} ${parseInt(d, 10)}, ${y}`;
  };

  // Generate calendar days array
  const blankDays = Array.from({ length: firstDayIndex }, (_, i) => null);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blankDays, ...monthDays];

  return (
    <div className="flex flex-col gap-1 w-full text-left relative" ref={containerRef} id={`custom-date-picker-${label.toLowerCase()}`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase font-bold text-neutral-500">{label}</span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[9px] text-red-400 hover:text-red-300 font-semibold cursor-pointer flex items-center gap-0.5"
            title="Clear date selection"
          >
            <X className="w-2.5 h-2.5" />
            Clear
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-neutral-900 border ${colors.border} text-white rounded-xl px-3 py-2 h-9 text-[11px] focus:outline-none transition-all cursor-pointer font-sans`}
      >
        <span className={value ? 'text-white' : 'text-neutral-500'}>
          {formatDateDisplay(value)}
        </span>
        <CalendarIcon className="w-3.5 h-3.5 text-neutral-500" />
      </button>

      {isOpen && (
        <div style={popupStyle} className="absolute z-50 mt-1 top-full bg-neutral-950 border border-neutral-850 rounded-2xl p-3 shadow-2xl animate-fadeIn backdrop-blur-md">
          {/* Header navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg border border-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-sans font-bold text-[11px] text-white">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg border border-neutral-900 hover:border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((wd) => (
              <span key={wd} className="text-[9px] text-neutral-500 font-bold uppercase font-mono">
                {wd}
              </span>
            ))}
          </div>

          {/* Grid of days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`blank-${idx}`} className="h-6 w-full" />;
              }

              const formattedMonth = (viewMonth + 1).toString().padStart(2, '0');
              const formattedDay = day.toString().padStart(2, '0');
              const cellDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

              const isSelected = value === cellDateStr;
              const isToday =
                today.getDate() === day &&
                today.getMonth() === viewMonth &&
                today.getFullYear() === viewYear;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-6 w-full rounded-lg font-sans text-[10px] font-medium flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? colors.textSelected
                      : isToday
                      ? `border ${colors.todayBorder} text-white`
                      : `text-neutral-300 ${colors.hoverBg}`
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
