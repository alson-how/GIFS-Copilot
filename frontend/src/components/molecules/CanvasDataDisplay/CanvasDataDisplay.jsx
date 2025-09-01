/**
 * CanvasDataDisplay Molecule
 * Displays OCR processing information from canvas data
 */

import React from 'react';
import PropTypes from 'prop-types';
import './CanvasDataDisplay.scss';

const CanvasDataDisplay = ({ canvasData }) => {
  if (!canvasData) return null;

  return (
    <div className="canvas-data-display">
      <h4 className="canvas-data-display__title">
        📋 Canvas Data
      </h4>
      <div className="canvas-data-display__content">
        <div className="canvas-data-display__field">
          <strong>Query:</strong> {canvasData.originalQuery}
        </div>
        {canvasData.extractedDate && (
          <div className="canvas-data-display__field">
            <strong>Date:</strong> {canvasData.extractedDate}
          </div>
        )}
        {canvasData.extractedDestination && (
          <div className="canvas-data-display__field">
            <strong>Destination:</strong> {canvasData.extractedDestination}
          </div>
        )}
        {canvasData.ocrData && (
          <div className="canvas-data-display__field">
            <strong>OCR:</strong> {canvasData.ocrData.documents?.length || 0} documents processed
          </div>
        )}
      </div>
    </div>
  );
};

CanvasDataDisplay.propTypes = {
  /** Canvas data object containing OCR and processing information */
  canvasData: PropTypes.shape({
    originalQuery: PropTypes.string,
    extractedDate: PropTypes.string,
    extractedDestination: PropTypes.string,
    ocrData: PropTypes.shape({
      documents: PropTypes.array
    })
  })
};

export default CanvasDataDisplay;