import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomDropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomDropdownOption[];
  activeTheme?: 'oled' | 'cosmic' | 'asgardian' | 'wakanda' | 'stark' | 'hydra';
  placeholder: string;
  label?: string;
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  activeTheme = 'oled',
  placeholder,
  label,
  align = 'left',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, options]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
      }
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (isOpen) {
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
        }
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
      e.preventDefault();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const getThemeStyles = () => {
    if (activeTheme && activeTheme.startsWith('light-')) {
      return {
        button: 'border-slate-300 bg-slate-50 text-slate-900 focus:border-marvel hover:border-slate-400',
        dropdown: 'border-slate-200 bg-white text-slate-900',
        highlight: 'bg-marvel/10 text-marvel',
        selected: 'text-marvel font-bold',
      };
    }

    switch (activeTheme) {
      case 'cosmic':
        return {
          button: 'border-indigo-500/30 bg-neutral-950/80 text-white focus:border-indigo-500 hover:border-indigo-500/50',
          dropdown: 'border-indigo-500/25 bg-neutral-950/95',
          highlight: 'bg-indigo-500/10 text-indigo-300',
          selected: 'text-indigo-400 font-bold',
        };
      case 'asgardian':
        return {
          button: 'border-amber-500/30 bg-neutral-950/80 text-white focus:border-amber-500 hover:border-amber-500/50',
          dropdown: 'border-amber-500/25 bg-neutral-950/95',
          highlight: 'bg-amber-500/10 text-amber-300',
          selected: 'text-amber-400 font-bold',
        };
      case 'wakanda':
        return {
          button: 'border-purple-500/30 bg-neutral-950/80 text-white focus:border-purple-500 hover:border-purple-500/50',
          dropdown: 'border-purple-500/25 bg-neutral-950/95',
          highlight: 'bg-purple-500/10 text-purple-300',
          selected: 'text-purple-400 font-bold',
        };
      case 'stark':
        return {
          button: 'border-sky-500/30 bg-neutral-950/80 text-white focus:border-sky-500 hover:border-sky-500/50',
          dropdown: 'border-sky-500/25 bg-neutral-950/95',
          highlight: 'bg-sky-500/10 text-sky-300',
          selected: 'text-sky-400 font-bold',
        };
      case 'hydra':
        return {
          button: 'border-red-500/30 bg-neutral-950/80 text-white focus:border-red-500 hover:border-red-500/50',
          dropdown: 'border-red-500/25 bg-neutral-950/95',
          highlight: 'bg-red-500/10 text-red-300',
          selected: 'text-red-400 font-bold',
        };
      default: // oled
        return {
          button: 'border-neutral-800 bg-neutral-950/90 text-white focus:border-marvel hover:border-neutral-700',
          dropdown: 'border-neutral-800 bg-neutral-950/98',
          highlight: 'bg-marvel/10 text-marvel-400',
          selected: 'text-marvel font-bold',
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <div 
      className={`relative w-full ${isOpen ? 'z-50' : 'z-20'}`} 
      ref={containerRef} 
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label className="text-[9px] uppercase font-bold text-neutral-500 mb-1 block">
          {label}
        </label>
      )}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between border rounded-xl p-2.5 ${compact ? 'text-[10px]' : 'text-xs'} text-left focus:outline-none transition-all cursor-pointer overflow-hidden ${themeStyles.button}`}
      >
        <span className={`truncate whitespace-nowrap overflow-hidden block flex-1 mr-2 ${selectedOption ? 'text-current font-medium' : 'text-neutral-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform duration-300 flex-shrink-0 ${
            isOpen ? 'transform rotate-180 text-white' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border p-0 backdrop-blur-md w-max min-w-full ${themeStyles.dropdown} ${
            align === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : align === 'right'
              ? 'right-0 left-auto'
              : 'left-0 right-auto'
          }`}
          style={{
            scrollbarWidth: 'none',
          }}
        >
          <div role="listbox" className="flex flex-col">
            {options.map((option, idx) => {
              const isSelected = option.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex items-center justify-between px-4 py-2.5 ${compact ? 'text-[10px]' : 'text-xs'} cursor-pointer transition-colors whitespace-nowrap gap-3 ${
                    isHighlighted ? themeStyles.highlight : 'text-neutral-300'
                  }`}
                >
                  <span className={`whitespace-nowrap font-sans block ${isSelected ? themeStyles.selected : ''}`}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check className={`w-3.5 h-3.5 shrink-0 ${activeTheme === 'cosmic' ? 'text-indigo-400' : activeTheme === 'asgardian' ? 'text-amber-400' : 'text-marvel'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
