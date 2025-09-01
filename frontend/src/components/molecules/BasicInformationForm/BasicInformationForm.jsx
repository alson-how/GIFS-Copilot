/**
 * BasicInformationForm Molecule
 * Form for core shipment details (date, transport mode, destination, consignee)
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Input, Select, Label } from '../../atoms';
import { FormSection } from '../FormSection';
import './BasicInformationForm.scss';

const BasicInformationForm = ({
  exportDate,
  setExportDate,
  mode,
  setMode,
  destination,
  setDestination,
  endUser,
  setEndUser,
  disabled = false,
  className = '',
  ...props
}) => {
  const transportModes = [
    { value: 'air', label: 'Air Freight' },
    { value: 'sea', label: 'Sea Freight' },
    { value: 'land', label: 'Land Transport' },
    { value: 'courier', label: 'Courier Service' }
  ];

  const destinations = [
    { value: 'China', label: 'China' },
    { value: 'USA', label: 'United States' },
    { value: 'Europe', label: 'Europe' },
    { value: 'Japan', label: 'Japan' },
    { value: 'South Korea', label: 'South Korea' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'Other', label: 'Other' }
  ];

  return (
    <FormSection
      title="Basic Information"
      icon="📋"
      required={true}
      className={`basic-information-form ${className}`}
      {...props}
    >
      <div className="basic-information-form__content">
        <div className="basic-information-form__row">
          <div className="basic-information-form__field">
            <Label htmlFor="export-date" required>
              Export Date
            </Label>
            <Input
              id="export-date"
              type="date"
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
              disabled={disabled}
              required
            />
          </div>

          <div className="basic-information-form__field">
            <Label htmlFor="transport-mode" required>
              Transport Mode
            </Label>
            <Select
              id="transport-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              options={transportModes}
              disabled={disabled}
              required
            />
          </div>
        </div>

        <div className="basic-information-form__row">
          <div className="basic-information-form__field">
            <Label htmlFor="destination" required>
              Destination Country
            </Label>
            <Select
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              options={destinations}
              disabled={disabled}
              required
            />
          </div>

          <div className="basic-information-form__field">
            <Label htmlFor="end-user">
              End User/Consignee
            </Label>
            <Input
              id="end-user"
              type="text"
              value={endUser}
              onChange={(e) => setEndUser(e.target.value)}
              placeholder="Enter end user or consignee name"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </FormSection>
  );
};

BasicInformationForm.propTypes = {
  /** Export date value */
  exportDate: PropTypes.string.isRequired,
  /** Function to update export date */
  setExportDate: PropTypes.func.isRequired,
  /** Transport mode value */
  mode: PropTypes.string.isRequired,
  /** Function to update transport mode */
  setMode: PropTypes.func.isRequired,
  /** Destination country value */
  destination: PropTypes.string.isRequired,
  /** Function to update destination */
  setDestination: PropTypes.func.isRequired,
  /** End user/consignee value */
  endUser: PropTypes.string.isRequired,
  /** Function to update end user */
  setEndUser: PropTypes.func.isRequired,
  /** Whether the form is disabled */
  disabled: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string
};

export default BasicInformationForm;