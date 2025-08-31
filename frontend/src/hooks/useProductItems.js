import { useState } from 'react';

/**
 * Utility functions for product validation
 */
const checkIfStrategic = (item) => {
  const strategicCategories = ['advanced_processors', 'high_performance_computing', 'ai_accelerators'];
  const strategicOrigins = ['usa', 'taiwan', 'south_korea'];
  return strategicCategories.includes(item.semiconductorCategory) || 
         strategicOrigins.includes(item.technologyOrigin);
};

const checkIfAIChip = (item) => {
  const aiCategories = ['ai_accelerators', 'neural_processing_units', 'machine_learning_chips'];
  return aiCategories.includes(item.semiconductorCategory) ||
         item.productDescription?.toLowerCase().includes('ai') ||
         item.productDescription?.toLowerCase().includes('neural');
};

/**
 * Custom hook for managing product items in a shipment
 */
export const useProductItems = () => {
  const createNewItem = () => ({
    id: crypto?.randomUUID?.() || Date.now().toString(),
    semiconductorCategory: 'standard_ic_asics',
    technologyOrigin: 'malaysia',
    hsCode: '',
    quantity: '',
    unit: 'PCS',
    unitPrice: '',
    endUsePurpose: '',
    productDescription: '',
    commercialValue: '',
    isStrategic: false,
    isAIChip: false
  });
  
  const [productItems, setProductItems] = useState([createNewItem()]);
  
  const addNewItem = () => {
    const newItem = createNewItem();
    setProductItems(prev => [...prev, newItem]);
  };
  
  const removeItem = (id) => {
    if (productItems.length > 1) {
      setProductItems(prev => prev.filter(item => item.id !== id));
    }
  };
  
  const updateItem = (id, field, value) => {
    setProductItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-detect strategic and AI chip status
        updatedItem.isStrategic = checkIfStrategic(updatedItem);
        updatedItem.isAIChip = checkIfAIChip(updatedItem);
        return updatedItem;
      }
      return item;
    }));
  };
  
  const duplicateItem = (id) => {
    const itemToDuplicate = productItems.find(item => item.id === id);
    if (itemToDuplicate) {
      const duplicatedItem = {
        ...itemToDuplicate,
        id: crypto?.randomUUID?.() || Date.now().toString()
      };
      setProductItems(prev => [...prev, duplicatedItem]);
    }
  };
  
  const resetItems = () => {
    setProductItems([createNewItem()]);
  };
  
  const getTotalValue = () => {
    return productItems.reduce((total, item) => {
      const value = parseFloat(item.commercialValue) || 0;
      return total + value;
    }, 0);
  };
  
  const getStrategicItems = () => {
    return productItems.filter(item => item.isStrategic);
  };
  
  const getAIChips = () => {
    return productItems.filter(item => item.isAIChip);
  };
  
  return {
    productItems,
    setProductItems,
    addNewItem,
    removeItem,
    updateItem,
    duplicateItem,
    resetItems,
    getTotalValue,
    getStrategicItems,
    getAIChips
  };
};