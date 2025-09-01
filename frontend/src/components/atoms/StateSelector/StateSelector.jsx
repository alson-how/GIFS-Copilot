import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './StateSelector.scss';

// State/Province data by country
const STATES_BY_COUNTRY = {
  MY: [
    'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Malacca', 'Negeri Sembilan',
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
  ],
  US: [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ],
  CA: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon'
  ],
  AU: [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
    'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
  ],
  GB: [
    'England', 'Scotland', 'Wales', 'Northern Ireland'
  ],
  DE: [
    'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse',
    'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate',
    'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
  ],
  IN: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ]
};

const StateSelector = ({ 
  country = '', 
  value = '', 
  onChange, 
  error = null,
  placeholder = 'Select state/province',
  disabled = false,
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  const availableStates = STATES_BY_COUNTRY[country] || [];
  const hasStates = availableStates.length > 0;
  
  const filteredStates = availableStates.filter(state =>
    state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const baseClass = 'state-selector';
  const classes = [
    baseClass,
    error && `${baseClass}--error`,
    (disabled || !hasStates) && `${baseClass}--disabled`,
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

  // Reset when country changes
  useEffect(() => {
    if (value && !availableStates.includes(value)) {
      onChange('');
    }
    setIsOpen(false);
    setSearchTerm('');
  }, [country, availableStates, value, onChange]);

  const handleToggle = () => {
    if (disabled || !hasStates) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSelect = (state) => {
    onChange(state);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (disabled || !hasStates) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredStates.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredStates.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredStates[focusedIndex]) {
          handleSelect(filteredStates[focusedIndex]);
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

  const getDisplayText = () => {
    if (!country) return 'Select country first';
    if (!hasStates) return 'Enter state/province manually';
    if (value) return value;
    return placeholder;
  };

  // If no states available for country, show text input
  if (!hasStates && country) {
    return (
      <div className={classes}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter state/province"
          disabled={disabled}
          className={`${baseClass}__text-input`}
          required={required}
          aria-invalid={!!error}
        />
        {error && (
          <div className={`${baseClass}__error`} role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }

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
          <span className={value ? `${baseClass}__selected` : `${baseClass}__placeholder`}>
            {getDisplayText()}
          </span>
        </div>
        <span className={`${baseClass}__arrow`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      
      {isOpen && hasStates && (
        <div className={`${baseClass}__dropdown`} role="listbox">
          <div className={`${baseClass}__search`}>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder="Search states/provinces..."
              className={`${baseClass}__search-input`}
            />
          </div>
          
          <div className={`${baseClass}__options`}>
            {filteredStates.map((state, index) => (
              <div
                key={state}
                className={`${baseClass}__option ${
                  index === focusedIndex ? `${baseClass}__option--focused` : ''
                } ${
                  state === value ? `${baseClass}__option--selected` : ''
                }`}
                onClick={() => handleSelect(state)}
                role="option"
                aria-selected={state === value}
              >
                {state}
              </div>
            ))}
            {filteredStates.length === 0 && (
              <div className={`${baseClass}__no-options`}>
                No states/provinces found
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

StateSelector.propTypes = {
  country: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  required: PropTypes.bool
};

export default StateSelector;