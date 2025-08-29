/**
 * Step Routing API Service
 * Frontend service for step completion, advancement, and workflow management
 */

const API_BASE = '/api/step-routing';

class StepRoutingAPI {
  /**
   * Complete a step and advance to next step
   * @param {string} shipmentId - Shipment identifier
   * @param {number} stepNumber - Step number to complete
   * @param {Object} stepData - Data from completed step
   * @returns {Promise<Object>} Step completion result
   */
  async completeStep(shipmentId, stepNumber, stepData = {}) {
    try {
      const response = await fetch(`${API_BASE}/complete/${shipmentId}/${stepNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete step');
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Failed to complete step ${stepNumber} for ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Determine next step without advancing
   * @param {string} shipmentId - Shipment identifier
   * @param {number} currentStep - Current step number
   * @returns {Promise<Object>} Next step information
   */
  async determineNextStep(shipmentId, currentStep) {
    try {
      const response = await fetch(`${API_BASE}/next/${shipmentId}/${currentStep}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to determine next step');
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Failed to determine next step for ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get shipments ready for a specific step
   * @param {number} stepNumber - Step number
   * @param {number} limit - Maximum number of shipments to return
   * @returns {Promise<Object>} Shipments for step
   */
  async getShipmentsForStep(stepNumber, limit = 50) {
    try {
      const response = await fetch(`${API_BASE}/shipments/step/${stepNumber}?limit=${limit}`, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get shipments for step');
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Failed to get shipments for step ${stepNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow status for multiple shipments
   * @param {Array} shipmentIds - Array of shipment IDs
   * @returns {Promise<Object>} Workflow status
   */
  async getWorkflowStatus(shipmentIds) {
    try {
      const response = await fetch(`${API_BASE}/workflow-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get workflow status');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get workflow status:', error);
      throw error;
    }
  }

  /**
   * Skip a step with reason
   * @param {string} shipmentId - Shipment identifier
   * @param {number} stepNumber - Step number to skip
   * @param {string} reason - Reason for skipping
   * @param {number} skipToStep - Optional target step number
   * @returns {Promise<Object>} Skip result
   */
  async skipStep(shipmentId, stepNumber, reason, skipToStep = null) {
    try {
      const response = await fetch(`${API_BASE}/skip/${shipmentId}/${stepNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, skipToStep })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to skip step');
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Failed to skip step ${stepNumber} for ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardStats() {
    try {
      const response = await fetch(`${API_BASE}/dashboard`, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get dashboard stats');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Reset shipment to step 1
   * @param {string} shipmentId - Shipment identifier
   * @param {string} reason - Reason for reset
   * @returns {Promise<Object>} Reset result
   */
  async resetShipment(shipmentId, reason = 'Manual reset') {
    try {
      const response = await fetch(`${API_BASE}/reset/${shipmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset shipment');
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Failed to reset shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get batch processing status
   * @param {string} batchId - Batch identifier
   * @returns {Promise<Object>} Batch status
   */
  async getBatchStatus(batchId) {
    try {
      const response = await fetch(`${API_BASE}/batch/${batchId}/status`, {
        method: 'GET'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get batch status');
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Failed to get batch status for ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Advance multiple shipments through workflow
   * @param {Array} shipmentIds - Array of shipment IDs
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Advancement results
   */
  async advanceMultipleShipments(shipmentIds, onProgress) {
    try {
      console.log(`🚀 Advancing ${shipmentIds.length} shipments through workflow`);

      const results = [];
      let completed = 0;

      for (const shipmentId of shipmentIds) {
        try {
          // Get current status
          const statusResult = await this.getWorkflowStatus([shipmentId]);
          const shipment = statusResult.shipments[0];

          if (!shipment) {
            throw new Error(`Shipment ${shipmentId} not found`);
          }

          // Determine next step
          const nextStepInfo = await this.determineNextStep(shipmentId, shipment.current_step);

          // Complete current step if not already completed
          if (nextStepInfo.nextStep) {
            const completeResult = await this.completeStep(shipmentId, shipment.current_step);
            results.push({
              shipmentId,
              success: true,
              previousStep: shipment.current_step,
              currentStep: completeResult.currentStep,
              routing: completeResult.routing
            });
          } else {
            results.push({
              shipmentId,
              success: true,
              previousStep: shipment.current_step,
              currentStep: shipment.current_step,
              message: 'Workflow already complete'
            });
          }

          completed++;
          onProgress?.({
            completed,
            total: shipmentIds.length,
            current: shipmentId,
            progress: Math.round((completed / shipmentIds.length) * 100)
          });

        } catch (error) {
          console.error(`❌ Failed to advance shipment ${shipmentId}:`, error);
          results.push({
            shipmentId,
            success: false,
            error: error.message
          });
          completed++;
          onProgress?.({
            completed,
            total: shipmentIds.length,
            current: shipmentId,
            progress: Math.round((completed / shipmentIds.length) * 100),
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`✅ Advancement complete: ${successCount} success, ${failureCount} failed`);

      return {
        success: true,
        total: shipmentIds.length,
        successful: successCount,
        failed: failureCount,
        results
      };

    } catch (error) {
      console.error('❌ Multiple shipment advancement failed:', error);
      throw error;
    }
  }

  /**
   * Get shipment progress summary
   * @param {string} shipmentId - Shipment identifier
   * @returns {Promise<Object>} Progress summary
   */
  async getShipmentProgress(shipmentId) {
    try {
      const workflowStatus = await this.getWorkflowStatus([shipmentId]);
      const shipment = workflowStatus.shipments[0];

      if (!shipment) {
        throw new Error(`Shipment ${shipmentId} not found`);
      }

      // Calculate progress
      const completedSteps = [
        shipment.step1_completed_at,
        shipment.step2_completed_at,
        shipment.step3_completed_at,
        shipment.step4_completed_at,
        shipment.step5_completed_at
      ].filter(Boolean).length;

      const progress = Math.round((completedSteps / 5) * 100);

      // Determine next action
      const stepNames = {
        1: 'Complete Shipment Basics',
        2: 'STA Compliance Screening',
        3: 'AI Chip Assessment',
        4: 'General Compliance Check',
        5: 'Prepare Documentation'
      };

      const nextAction = shipment.current_step <= 5 
        ? stepNames[shipment.current_step] 
        : 'Ready for Export';

      return {
        success: true,
        shipmentId,
        currentStep: shipment.current_step,
        progress,
        nextAction,
        completedSteps,
        totalSteps: 5,
        isComplete: shipment.current_step >= 999,
        shipmentData: shipment
      };

    } catch (error) {
      console.error(`❌ Failed to get progress for shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Monitor workflow progression with polling
   * @param {Array} shipmentIds - Array of shipment IDs
   * @param {Function} onUpdate - Update callback
   * @param {number} interval - Polling interval in milliseconds
   * @returns {Promise<void>} Monitoring promise
   */
  async monitorWorkflowProgress(shipmentIds, onUpdate, interval = 5000) {
    const poll = async () => {
      try {
        const workflowStatus = await this.getWorkflowStatus(shipmentIds);
        
        // Calculate overall progress
        const totalShipments = workflowStatus.shipments.length;
        const completedShipments = workflowStatus.shipments.filter(s => s.current_step >= 999).length;
        const overallProgress = totalShipments > 0 ? Math.round((completedShipments / totalShipments) * 100) : 0;

        // Group by current step
        const stepGroups = {};
        workflowStatus.shipments.forEach(shipment => {
          const step = shipment.current_step;
          if (!stepGroups[step]) {
            stepGroups[step] = [];
          }
          stepGroups[step].push(shipment);
        });

        const updateData = {
          totalShipments,
          completedShipments,
          overallProgress,
          stepGroups,
          shipments: workflowStatus.shipments,
          timestamp: new Date().toISOString()
        };

        onUpdate?.(updateData);

        // Continue polling if not all complete
        if (completedShipments < totalShipments) {
          setTimeout(poll, interval);
        }

      } catch (error) {
        console.error('❌ Workflow monitoring error:', error);
        onUpdate?.({ error: error.message });
      }
    };

    // Start polling
    poll();
  }
}

// Create and export singleton instance
const stepRoutingAPI = new StepRoutingAPI();
export { stepRoutingAPI };
