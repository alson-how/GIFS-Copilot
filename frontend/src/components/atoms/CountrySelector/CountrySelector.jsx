import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './CountrySelector.scss';

// Common countries list with flags and names
const COUNTRIES = [
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' }
];

const CountrySelector = ({ 
  value = '', 
  onChange, 
  error = null,
  placeholder = 'Select country',
  disabled = false,
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  const selectedCountry = COUNTRIES.find(country => country.code === value);
  
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const baseClass = 'country-selector';
  const classes = [
    baseClass,
    error && `${baseClass}--error`,
    disabled && `${baseClass}--disabled`,
    isOpen && `${baseClass}--open`,
    className
  ].filter(Boolean).join(' ');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSelect = (country) => {
    onChange(country.code);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredCountries.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCountries.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredCountries[focusedIndex]) {
          handleSelect(filteredCountries[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setFocusedIndex(-1);
  };

  return (
    <div className={classes} ref={dropdownRef}>
      <div 
        className={`${baseClass}__trigger`}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
        aria-invalid={!!error}
      >
        <div className={`${baseClass}__value`}>
          {selectedCountry ? (
            <>
              <span className={`${baseClass}__flag`}>{selectedCountry.flag}</span>
              <span className={`${baseClass}__name`}>{selectedCountry.name}</span>
            </>
          ) : (
            <span className={`${baseClass}__placeholder`}>{placeholder}</span>
          )}
        </div>
        <span className={`${baseClass}__arrow`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      
      {isOpen && (
        <div className={`${baseClass}__dropdown`} role="listbox">
          <div className={`${baseClass}__search`}>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder="Search countries..."
              className={`${baseClass}__search-input`}
            />
          </div>
          
          <div className={`${baseClass}__options`}>
            {filteredCountries.map((country, index) => (
              <div
                key={country.code}
                className={`${baseClass}__option ${
                  index === focusedIndex ? `${baseClass}__option--focused` : ''
                } ${
                  country.code === value ? `${baseClass}__option--selected` : ''
                }`}
                onClick={() => handleSelect(country)}
                role="option"
                aria-selected={country.code === value}
              >
                <span className={`${baseClass}__option-flag`}>{country.flag}</span>
                <span className={`${baseClass}__option-name`}>{country.name}</span>
                <span className={`${baseClass}__option-code`}>{country.code}</span>
              </div>
            ))}
            {filteredCountries.length === 0 && (
              <div className={`${baseClass}__no-options`}>
                No countries found
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div className={`${baseClass}__error`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

CountrySelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  required: PropTypes.bool
};

export default CountrySelector;