import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { playCyberSound } from '../../utils/helpers';

export interface CyberSelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  description?: string;
  color?: string; // Hex color or dot class
  disabled?: boolean;
}

export interface CyberSelectProps<T extends string = string> {
  id?: string;
  name?: string;
  value: T;
  onChange: (value: T) => void;
  options: CyberSelectOption<T>[];
  placeholder?: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'card' | 'emerald' | 'cyan' | 'amber' | 'transparent';
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  position?: 'bottom' | 'top' | 'auto';
  soundEnabled?: boolean;
  'aria-label'?: string;
}

export function CyberSelect<T extends string = string>({
  id: explicitId,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  label,
  size = 'sm',
  variant = 'default',
  searchable,
  searchPlaceholder = 'Search options...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  align = 'left',
  soundEnabled = true,
  'aria-label': ariaLabel,
}: CyberSelectProps<T>) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Determine if search should be enabled (auto-enable if options > 8 and not explicitly disabled)
  const isSearchable = searchable ?? options.length > 8;

  // Selected option details
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.description && opt.description.toLowerCase().includes(query)) ||
        opt.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSearchable]);

  // Reset search and highlight on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    } else {
      const currentIndex = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, filteredOptions, value]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        if (soundEnabled) playCyberSound('click');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          if (!opt.disabled) {
            handleSelect(opt.value);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
    if (soundEnabled) playCyberSound('toggle');
  };

  // Size styling
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[11px] gap-1.5 rounded',
    sm: 'px-2.5 py-1 text-xs gap-2 rounded-lg',
    md: 'px-3 py-2 text-xs gap-2.5 rounded-lg',
  }[size];

  // Variant styling for trigger
  const variantClasses = {
    default:
      'bg-cyber-bg border-cyber-border text-cyber-text hover:border-cyber-borderGlow hover:bg-cyber-card/60 focus:border-cyber-cyan',
    card:
      'bg-cyber-card border-cyber-border text-cyber-text hover:border-cyber-borderGlow hover:bg-cyber-card/80 focus:border-cyber-cyan',
    emerald:
      'bg-cyber-bg border-cyber-border text-white hover:border-cyber-emerald/50 focus:border-cyber-emerald',
    cyan:
      'bg-cyber-bg border-cyber-border text-cyber-cyan hover:border-cyber-cyan focus:border-cyber-cyan',
    amber:
      'bg-cyber-bg border-cyber-border text-cyber-amber hover:border-cyber-amber focus:border-cyber-amber',
    transparent:
      'bg-transparent border-transparent text-cyber-text hover:bg-cyber-bg/50 focus:border-cyber-cyan',
  }[variant];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left font-mono ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for HTML form submission compatibility */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Optional Top Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold text-[10px]"
        >
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (soundEnabled) playCyberSound('click');
          }
        }}
        className={`w-full flex items-center justify-between border font-semibold transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-cyber-cyan/40 select-none ${sizeClasses} ${variantClasses} ${
          isOpen ? 'border-cyber-cyan shadow-glow-cyan/20 ring-1 ring-cyber-cyan/30' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {/* Option Color Indicator Dot */}
          {selectedOption?.color && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}

          {/* Option Icon */}
          {selectedOption?.icon && (
            <span className="flex-shrink-0 flex items-center">{selectedOption.icon}</span>
          )}

          {/* Label Text */}
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-cyber-muted">{placeholder}</span>}
          </span>
        </span>

        {/* Chevron Indicator */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-cyber-muted flex-shrink-0 transition-transform duration-200 ml-1.5 ${
            isOpen ? 'rotate-180 text-cyber-cyan' : ''
          }`}
        />
      </button>

      {/* Dropdown Floating Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            role="listbox"
            id={`${id}-listbox`}
            aria-label={ariaLabel || label || placeholder}
            className={`absolute z-50 mt-1 min-w-[170px] w-max max-w-xs rounded-xl border border-cyber-border bg-cyber-card/95 backdrop-blur-md shadow-2xl p-1 text-xs text-cyber-text ${
              align === 'right' ? 'right-0' : 'left-0'
            } ${menuClassName}`}
          >
            {/* Search Filter Header (when searchable or > 8 options) */}
            {isSearchable && (
              <div className="px-1.5 pt-1 pb-1.5 border-b border-cyber-border/70 mb-1">
                <div className="relative flex items-center">
                  <Search className="w-3 h-3 text-cyber-muted absolute left-2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    id={`${id || 'cyber-select'}-search-input`}
                    name={`${name || id || 'cyber-select'}-search`}
                    aria-label={searchPlaceholder || "Search options"}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full bg-cyber-bg pl-7 pr-6 py-1 rounded-md border border-cyber-border/80 text-[11px] text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-1.5 text-cyber-muted hover:text-cyber-text p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div
              ref={optionsListRef}
              className="max-h-56 overflow-y-auto space-y-0.5 scrollbar-thin pr-0.5"
            >
              {filteredOptions.length === 0 ? (
                <div className="py-3 px-2 text-center text-cyber-muted text-[11px]">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors duration-100 ${
                        isSelected
                          ? 'bg-cyber-cyan/15 text-cyber-cyan font-bold border border-cyber-cyan/30'
                          : isHighlighted
                          ? 'bg-cyber-bg text-cyber-text'
                          : 'text-cyber-muted hover:bg-cyber-bg hover:text-cyber-text'
                      } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {/* Option Color Dot */}
                        {opt.color && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}

                        {/* Option Icon */}
                        {opt.icon && (
                          <span className="flex-shrink-0 flex items-center">{opt.icon}</span>
                        )}

                        <div className="truncate">
                          <div className="truncate">{opt.label}</div>
                          {opt.description && (
                            <div className="text-[10px] text-cyber-muted font-normal truncate">
                              {opt.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {opt.badge && <span>{opt.badge}</span>}
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyber-cyan" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface CyberMultiSelectProps<T extends string = string> {
  id?: string;
  name?: string;
  selectedValues: T[];
  onChange: (values: T[]) => void;
  options: CyberSelectOption<T>[];
  placeholder?: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'default' | 'card' | 'emerald' | 'cyan' | 'amber' | 'transparent';
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  soundEnabled?: boolean;
  'aria-label'?: string;
}

export function CyberMultiSelect<T extends string = string>({
  id: explicitId,
  name,
  selectedValues,
  onChange,
  options,
  placeholder = 'Select multiple...',
  label,
  size = 'sm',
  variant = 'default',
  searchPlaceholder = 'Filter tags...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  align = 'left',
  soundEnabled = true,
  'aria-label': ariaLabel,
}: CyberMultiSelectProps<T>) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q));
  }, [options, searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleOption = (val: T) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
    if (soundEnabled) playCyberSound('toggle');
  };

  const handleClearAll = () => {
    onChange([]);
    if (soundEnabled) playCyberSound('click');
  };

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[11px] gap-1.5 rounded',
    sm: 'px-2.5 py-1 text-xs gap-2 rounded-lg',
    md: 'px-3 py-2 text-xs gap-2.5 rounded-lg',
  }[size];

  const variantClasses = {
    default:
      'bg-cyber-bg border-cyber-border text-cyber-text hover:border-cyber-borderGlow hover:bg-cyber-card/60 focus:border-cyber-cyan',
    card:
      'bg-cyber-card border-cyber-border text-cyber-text hover:border-cyber-borderGlow hover:bg-cyber-card/80 focus:border-cyber-cyan',
    emerald:
      'bg-cyber-bg border-cyber-border text-white hover:border-cyber-emerald/50 focus:border-cyber-emerald',
    cyan:
      'bg-cyber-bg border-cyber-border text-cyber-cyan hover:border-cyber-cyan focus:border-cyber-cyan',
    amber:
      'bg-cyber-bg border-cyber-border text-cyber-amber hover:border-cyber-amber focus:border-cyber-amber',
    transparent:
      'bg-transparent border-transparent text-cyber-text hover:bg-cyber-bg/50 focus:border-cyber-cyan',
  }[variant];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left font-mono ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
        }
      }}
    >
      {name && <input type="hidden" name={name} value={selectedValues.join(',')} />}

      {label && (
        <label htmlFor={id} className="block text-cyber-muted uppercase tracking-wider mb-1 font-semibold text-[10px]">
          {label}
        </label>
      )}

      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (soundEnabled) playCyberSound('click');
          }
        }}
        className={`w-full flex items-center justify-between border font-semibold transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-cyber-cyan/40 select-none ${sizeClasses} ${variantClasses} ${
          isOpen ? 'border-cyber-cyan shadow-glow-cyan/20 ring-1 ring-cyber-cyan/30' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${triggerClassName}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className="truncate">
            {selectedValues.length === 0 ? (
              <span className="text-cyber-muted">{placeholder}</span>
            ) : selectedValues.length === 1 ? (
              <span className="text-cyber-cyan font-bold">{selectedValues[0]}</span>
            ) : (
              <span className="text-cyber-cyan font-bold">
                {placeholder} ({selectedValues.length})
              </span>
            )}
          </span>
        </span>

        <div className="flex items-center gap-1 ml-1.5 flex-shrink-0">
          {selectedValues.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse" />
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-cyber-muted transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-cyber-cyan' : ''
            }`}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            role="listbox"
            id={`${id}-listbox`}
            aria-label={ariaLabel || label || placeholder}
            className={`absolute z-50 mt-1 min-w-[200px] w-max max-w-xs rounded-xl border border-cyber-border bg-cyber-card/95 backdrop-blur-md shadow-2xl p-1.5 text-xs text-cyber-text ${
              align === 'right' ? 'right-0' : 'left-0'
            } ${menuClassName}`}
          >
            <div className="px-1 pt-0.5 pb-1.5 border-b border-cyber-border/70 mb-1 space-y-1.5">
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-cyber-muted absolute left-2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  id={`${id || 'cyber-multiselect'}-search-input`}
                  name={`${name || id || 'cyber-multiselect'}-search`}
                  aria-label={searchPlaceholder || "Search options"}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-cyber-bg pl-7 pr-6 py-1 rounded-md border border-cyber-border/80 text-[11px] text-cyber-text placeholder-cyber-muted focus:outline-none focus:border-cyber-cyan"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-1.5 text-cyber-muted hover:text-cyber-text p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {selectedValues.length > 0 && (
                <div className="flex items-center justify-between px-1 text-[10px]">
                  <span className="text-cyber-cyan font-bold">{selectedValues.length} selected</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-cyber-crimson hover:underline font-bold transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto space-y-0.5 scrollbar-thin pr-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-3 px-2 text-center text-cyber-muted text-[11px]">
                  No matching tags found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggleOption(opt.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-colors duration-100 cursor-pointer ${
                        isSelected
                          ? 'bg-cyber-cyan/15 text-cyber-cyan font-bold border border-cyber-cyan/30'
                          : 'text-cyber-muted hover:bg-cyber-bg hover:text-cyber-text'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {/* Checkbox Box */}
                        <div
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-cyber-cyan border-cyber-cyan text-black'
                              : 'border-cyber-border bg-cyber-bg'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>

                        <span className="truncate">{opt.label}</span>
                      </div>

                      {opt.badge && <span>{opt.badge}</span>}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

