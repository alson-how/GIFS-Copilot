// API Request/Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  errors?: ApiError[];
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    requestId: string;
  };
}

export interface ApiError {
  field?: string;
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request configuration
export interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

// File upload types
export interface FileUploadRequest {
  shipment_id: string;
  tag?: string;
  files: File[];
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  tag: string;
  uploadedAt: string;
  url?: string;
}

export interface FileListResponse {
  files: UploadedFile[];
  total: number;
}

// OCR and document processing types
export interface OCRResult {
  text: string;
  confidence: number;
  boxes: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  }[];
}

export interface DocumentProcessingResult {
  shipmentId: string;
  extractedData: {
    invoice?: {
      number: string;
      date: string;
      total: number;
      currency: string;
      items: {
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }[];
    };
    packingList?: {
      items: {
        description: string;
        quantity: number;
        weight: number;
        dimensions: {
          length: number;
          width: number;
          height: number;
          unit: string;
        };
      }[];
    };
    certificate?: {
      type: string;
      number: string;
      issueDate: string;
      expiryDate?: string;
      issuer: string;
    };
  };
  ocr: OCRResult;
  processingTime: number;
}

// Strategic items and compliance types
export interface ComplianceCheckRequest {
  shipmentId: string;
  productItems: {
    description: string;
    hsCode: string;
    category: string;
    origin: string;
    destination: string;
  }[];
  destination: string;
  endUser: string;
}

export interface ComplianceCheckResult {
  overall: {
    status: 'compliant' | 'restricted' | 'blocked';
    score: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  items: {
    id: string;
    status: 'compliant' | 'strategic' | 'prohibited';
    flags: string[];
    requiredLicenses: string[];
    restrictions: string[];
  }[];
  permits: {
    type: string;
    required: boolean;
    description: string;
    authority: string;
    processingTime?: string;
  }[];
  recommendations: string[];
}

// User and authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  company?: {
    id: string;
    name: string;
    registrationNumber: string;
    country: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  createdAt: string;
  lastLoginAt?: string;
}

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

// Audit and logging types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

// System status and health types
export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    name: string;
    status: 'up' | 'down';
    responseTime?: number;
    lastCheck: string;
  }[];
  version: string;
  uptime: number;
}