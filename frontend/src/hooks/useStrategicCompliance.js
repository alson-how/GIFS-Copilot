import { useState, useEffect } from 'react';

/**
 * Custom hook for managing strategic items compliance checking
 */
export const useStrategicCompliance = () => {
  const [strategicItemsDetected, setStrategicItemsDetected] = useState(false);
  const [strategicDetectionComplete, setStrategicDetectionComplete] = useState(false);
  const [strategicDetectionLoading, setStrategicDetectionLoading] = useState(false);
  const [exportBlocked, setExportBlocked] = useState(false);
  const [complianceScore, setComplianceScore] = useState(100);
  const [missingPermits, setMissingPermits] = useState([]);
  const [complianceIssues, setComplianceIssues] = useState([]);
  
  const checkCompliance = async (productItems) => {
    setStrategicDetectionLoading(true);
    
    try {
      // Simulate API call for compliance checking
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const strategicItems = productItems.filter(item => item.isStrategic);
      const aiChips = productItems.filter(item => item.isAIChip);
      
      const hasStrategicItems = strategicItems.length > 0 || aiChips.length > 0;
      setStrategicItemsDetected(hasStrategicItems);
      
      // Calculate compliance score based on detected items
      let score = 100;
      const issues = [];
      const permits = [];
      
      if (strategicItems.length > 0) {
        score -= strategicItems.length * 20;
        issues.push(`${strategicItems.length} strategic item(s) detected`);
        permits.push('Strategic Export License');
      }
      
      if (aiChips.length > 0) {
        score -= aiChips.length * 25;
        issues.push(`${aiChips.length} AI chip(s) detected`);
        permits.push('AI Technology Export Permit');
      }
      
      // Check for high-risk destinations
      const highRiskDestinations = ['China', 'Russia', 'Iran', 'North Korea'];
      const destination = 'China'; // This would come from form data
      
      if (hasStrategicItems && highRiskDestinations.includes(destination)) {
        score -= 30;
        issues.push(`Export to ${destination} requires additional permits`);
        permits.push('Enhanced End-Use Monitoring');
      }
      
      setComplianceScore(Math.max(0, score));
      setComplianceIssues(issues);
      setMissingPermits(permits);
      setExportBlocked(score < 50);
      setStrategicDetectionComplete(true);
      
      return {
        strategicItemsDetected: hasStrategicItems,
        complianceScore: Math.max(0, score),
        exportBlocked: score < 50,
        issues,
        permits
      };
    } catch (error) {
      console.error('Compliance check failed:', error);
      throw error;
    } finally {
      setStrategicDetectionLoading(false);
    }
  };
  
  const resetCompliance = () => {
    setStrategicItemsDetected(false);
    setStrategicDetectionComplete(false);
    setStrategicDetectionLoading(false);
    setExportBlocked(false);
    setComplianceScore(100);
    setMissingPermits([]);
    setComplianceIssues([]);
  };
  
  const getComplianceStatus = () => {
    if (strategicDetectionLoading) return 'checking';
    if (!strategicDetectionComplete) return 'pending';
    if (exportBlocked) return 'blocked';
    if (strategicItemsDetected) return 'restricted';
    return 'compliant';
  };
  
  return {
    strategicItemsDetected,
    strategicDetectionComplete,
    strategicDetectionLoading,
    exportBlocked,
    complianceScore,
    missingPermits,
    complianceIssues,
    checkCompliance,
    resetCompliance,
    getComplianceStatus
  };
};