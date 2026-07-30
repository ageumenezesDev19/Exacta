import React, { useState, useRef, useEffect } from 'react';
import '../styles/CustomDropdown.scss';

/** A plain string is used when the value and the label are the same. */
export type DropdownOption = string | { value: string; label: string };

interface Props {
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  /** Announced to screen readers, since the trigger shows only the value. */
  label?: string;
}

const valueOf = (option: DropdownOption) =>
  typeof option === 'string' ? option : option.value;
const labelOf = (option: DropdownOption) =>
  typeof option === 'string' ? option : option.label;

/**
 * Replaces the native select so the menu belongs to the app instead of the
 * operating system. It is a real listbox: focusable, driven by the arrow keys,
 * and announced with its state — the previous version was a div with a click
 * handler, unreachable by keyboard.
 */
export const CustomDropdown: React.FC<Props> = ({
  options,
  selectedValue,
  onSelect,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  /* The list scrolls once there are more profiles than fit, and the one you
     care about is usually the selected one. Without this it opened with the
     selection clipped at the bottom edge, and arrowing past the visible rows
     went nowhere. */
  useEffect(() => {
    if (isOpen) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [isOpen, activeIndex]);

  const selected = options.find((option) => valueOf(option) === selectedValue);
  const selectedLabel = selected ? labelOf(selected) : selectedValue;

  const commit = (option: DropdownOption) => {
    onSelect(valueOf(option));
    setIsOpen(false);
  };

  const open = (index = options.findIndex((o) => valueOf(o) === selectedValue)) => {
    setActiveIndex(index < 0 ? 0 : index);
    setIsOpen(true);
  };

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      commit(options[activeIndex]);
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`custom-dropdown ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className="dropdown-selected"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedLabel}</span>
        <span className="chevron" aria-hidden="true"></span>
      </button>

      {isOpen && (
        <ul className="dropdown-options" role="listbox" aria-label={label}>
          {options.map((option, index) => {
            const value = valueOf(option);
            const isSelected = value === selectedValue;
            return (
              <li
                key={value}
                ref={index === activeIndex ? activeRef : undefined}
                role="option"
                aria-selected={isSelected}
                className={`${isSelected ? 'selected' : ''} ${index === activeIndex ? 'active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(option)}
              >
                {labelOf(option)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};