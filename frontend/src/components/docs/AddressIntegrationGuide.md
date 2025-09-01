# Address Book Integration Guide

This guide explains how the address book feature is integrated throughout the shipment creation workflow.

## Overview

The address book integration provides:
- **Saved Address Selection**: Quick selection from previously saved addresses
- **New Address Creation**: Ability to create and save new addresses during shipment flow  
- **Automatic Form Population**: Selected addresses automatically populate form fields
- **Consistent Data**: Reduced errors through standardized address formats
- **Time Savings**: Faster shipment creation for repeat customers/locations

## Integration Points

### 1. StepBasics Component (`/components/StepBasics.jsx`)

**Location**: Delivery Address & Destination section
- Replaces manual country/end-user entry with address selector
- Supports both address book selection and manual entry modes
- Auto-populates destination country and end user from selected address

**Usage**:
```jsx
<AddressSelector
  value={deliveryAddress}
  onChange={handleDeliveryAddressChange}
  type="shipping"
  label="Delivery Address"
  required={true}
  placeholder="Choose a saved delivery address or enter a new one"
/>
```

### 2. PickupMethodForm Component (`/components/molecules/PickupMethodForm/PickupMethodForm.jsx`)

**Location**: Pickup from Location section
- Integrates address book for pickup addresses
- Converts selected address to pickup details format
- Maintains backward compatibility with manual address entry

**Usage**:
```jsx
<PickupMethodForm
  pickupMethod={formData.pickupMethod}
  pickupDetails={formData.pickupDetails}
  onPickupMethodChange={handlePickupMethodChange}
  onPickupDetailsChange={handlePickupDetailsChange}
  enableAddressBook={true}  // New prop
/>
```

### 3. EnhancedShipmentForm Component (`/components/organisms/EnhancedShipmentForm/EnhancedShipmentForm.jsx`)

**Location**: Throughout multi-step form
- Uses `ShipmentAddressForm` for comprehensive address management
- Supports both origin and destination address selection
- Integrates with existing form validation and error handling

## Components Reference

### AddressSelector (`/components/molecules/AddressSelector/AddressSelector.jsx`)

Core component for address selection with the following features:

**Props**:
```jsx
{
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onChange: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['shipping', 'billing']),
  label: PropTypes.string,
  required: PropTypes.bool,
  allowNewAddress: PropTypes.bool,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  className: PropTypes.string
}
```

**Features**:
- Dropdown selection of saved addresses
- Inline new address form
- Address preview with contact details
- Type filtering (shipping/billing)
- Validation and error display

### useAddressIntegration Hook (`/hooks/useAddressIntegration.js`)

Provides reusable address management functionality:

**Returns**:
```javascript
{
  // State
  selectedOriginAddress,
  selectedDestinationAddress,
  addresses,
  loading,
  error,

  // Actions
  loadAddresses,
  handleOriginAddressChange,
  handleDestinationAddressChange,
  createAddressFromForm,
  reset,

  // Utilities
  addressToFormFields,
  formatAddress,
  getSuggestedAddresses,
  validateAddress
}
```

### ShipmentAddressForm (`/components/organisms/ShipmentAddressForm/ShipmentAddressForm.jsx`)

Complete address form for shipment workflows:

**Props**:
```jsx
{
  originAddress: PropTypes.object,
  destinationAddress: PropTypes.object,
  onOriginChange: PropTypes.func,
  onDestinationChange: PropTypes.func,
  errors: PropTypes.object,
  showOrigin: PropTypes.bool,
  showDestination: PropTypes.bool,
  className: PropTypes.string
}
```

## API Integration

### AddressService (`/services/addressService.js`)

Provides API methods for address management:

```javascript
// Get all addresses
AddressService.getAddresses({ type: 'shipping', limit: 50 })

// Create new address
AddressService.createAddress(addressData)

// Update existing address  
AddressService.updateAddress(id, addressData)

// Set default address
AddressService.setDefaultAddress(id)

// Delete address
AddressService.deleteAddress(id)
```

## Data Flow

1. **Address Loading**: Components load addresses via `AddressService.getAddresses()`
2. **Address Selection**: User selects from dropdown or creates new address
3. **Data Conversion**: Selected address is converted to form-specific format
4. **Form Population**: Parent component receives formatted address data
5. **Shipment Creation**: Address data is included in shipment payload

## Form Integration Examples

### Basic Integration
```jsx
import { AddressSelector } from './components/molecules/AddressSelector/AddressSelector';

const MyForm = () => {
  const [selectedAddress, setSelectedAddress] = useState(null);

  const handleAddressChange = (address) => {
    setSelectedAddress(address);
    // Update other form fields based on address
    setCountry(address?.country || '');
    setCity(address?.city || '');
  };

  return (
    <AddressSelector
      value={selectedAddress}
      onChange={handleAddressChange}
      type="shipping"
      required
    />
  );
};
```

### Advanced Integration with Hook
```jsx
import { useAddressIntegration } from './hooks/useAddressIntegration';

const MyShipmentForm = () => {
  const {
    selectedDestinationAddress,
    handleDestinationAddressChange,
    formatAddress,
    loadAddresses
  } = useAddressIntegration();

  useEffect(() => {
    loadAddresses('shipping');
  }, []);

  return (
    <AddressSelector
      value={selectedDestinationAddress}
      onChange={handleDestinationAddressChange}
      type="shipping"
    />
  );
};
```

## Error Handling

The integration includes comprehensive error handling:

- **Network Errors**: Graceful fallback when address service is unavailable
- **Validation Errors**: Address validation with user-friendly error messages  
- **Authentication Errors**: Automatic token refresh and login redirect
- **Data Errors**: Fallback to manual entry when address data is incomplete

## Security Considerations

- **No Mock Data**: All mock data fallbacks removed for production security
- **Authentication Required**: All address operations require valid JWT token
- **Data Validation**: Server-side validation of all address data
- **Rate Limiting**: API rate limiting prevents abuse

## Performance Optimizations

- **Caching**: Addresses cached after initial load
- **Lazy Loading**: Address details loaded on demand
- **Debounced Search**: Search functionality with debounced input
- **Pagination**: Large address lists paginated for performance

## Troubleshooting

### Common Issues

1. **Addresses Not Loading**
   - Check authentication token validity
   - Verify API endpoint accessibility
   - Check network connectivity

2. **Address Not Saving**
   - Verify required fields are populated
   - Check for validation errors
   - Ensure user has address creation permissions

3. **Form Not Populating**
   - Verify `onChange` handler is properly implemented
   - Check address data format compatibility
   - Ensure parent component state updates

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('DEBUG_ADDRESS_INTEGRATION', 'true');
```

## Future Enhancements

Planned improvements include:
- Address geocoding and validation
- Bulk address import/export
- Address sharing between team members
- Integration with external address services
- Mobile-optimized address entry