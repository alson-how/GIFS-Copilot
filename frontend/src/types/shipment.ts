export interface ProductItem {
  id: string;
  semiconductorCategory: SemiconductorCategory;
  technologyOrigin: TechnologyOrigin;
  hsCode: string;
  quantity: string;
  unit: ProductUnit;
  unitPrice: string;
  endUsePurpose: string;
  productDescription: string;
  commercialValue: string;
  isStrategic: boolean;
  isAIChip: boolean;
}

export interface ShipmentData {
  shipmentId: string;
  exportDate: string;
  mode: TransportationMode;
  destination: string;
  endUser: string;
  currency: Currency;
  incoterms: Incoterms;
  insuranceRequired: boolean;
  consigneeRegistration: string;
  shipmentPriority: ShipmentPriority;
}

export interface ComplianceData {
  strategicItemsDetected: boolean;
  strategicDetectionComplete: boolean;
  strategicDetectionLoading: boolean;
  exportBlocked: boolean;
  complianceScore: number;
  missingPermits: string[];
  complianceIssues: string[];
}

export interface UIState {
  loading: boolean;
  error: string | null;
  status: string;
  currentStep: number;
  isSubmitting: boolean;
}

export interface ShipmentState {
  shipment: ShipmentData;
  productItems: ProductItem[];
  compliance: ComplianceData;
  ui: UIState;
}

// Enums and Union Types
export type SemiconductorCategory = 
  | 'standard_ic_asics'
  | 'advanced_processors'
  | 'high_performance_computing'
  | 'ai_accelerators'
  | 'neural_processing_units'
  | 'machine_learning_chips'
  | 'memory_controllers'
  | 'power_management'
  | 'analog_mixed_signal'
  | 'rf_microwave';

export type TechnologyOrigin = 
  | 'malaysia'
  | 'usa'
  | 'taiwan'
  | 'south_korea'
  | 'japan'
  | 'china'
  | 'singapore'
  | 'germany'
  | 'netherlands';

export type ProductUnit = 
  | 'PCS'
  | 'KG'
  | 'UNITS'
  | 'WAFERS'
  | 'LOTS'
  | 'REELS'
  | 'TRAYS';

export type TransportationMode = 
  | 'air'
  | 'sea'
  | 'land'
  | 'express';

export type Currency = 
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CNY'
  | 'SGD'
  | 'MYR';

export type Incoterms = 
  | 'FOB'
  | 'CIF'
  | 'EXW'
  | 'DDP'
  | 'CPT'
  | 'DAP'
  | 'FCA'
  | 'CFR';

export type ShipmentPriority = 
  | 'Standard'
  | 'Urgent'
  | 'Critical';

export type ComplianceStatus = 
  | 'pending'
  | 'checking'
  | 'compliant'
  | 'restricted'
  | 'blocked';

// API Response Types
export interface ShipmentSubmissionResponse {
  success: boolean;
  shipmentId: string;
  message: string;
  data?: {
    shipment: ShipmentData;
    compliance: ComplianceData;
  };
  errors?: {
    field: string;
    message: string;
  }[];
}

export interface FileUploadResponse {
  success: boolean;
  files: {
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  }[];
  message: string;
}

// Form Props Types
export interface ShipmentFormProps {
  onSaved?: (data: ShipmentSubmissionResponse) => void;
  defaultShipmentId?: string;
  canvasData?: {
    shipmentId?: string;
    [key: string]: unknown;
  };
  isCanvas?: boolean;
  className?: string;
}

export interface ProductItemFormProps {
  item: ProductItem;
  onUpdate: (id: string, field: keyof ProductItem, value: string | boolean) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  isRemovable: boolean;
  className?: string;
}