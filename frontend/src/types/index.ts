// Export all types from different modules
export * from './shipment';
export * from './components';
export * from './api';

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event handler types
export type EventHandler<T = unknown> = (event: T) => void;
export type ChangeHandler<T = string> = (value: T) => void;
export type ClickHandler = (event: React.MouseEvent) => void;
export type SubmitHandler = (event: React.FormEvent) => void;

// Generic function types
export type AsyncFunction<T = unknown, R = unknown> = (...args: T[]) => Promise<R>;
export type SyncFunction<T = unknown, R = unknown> = (...args: T[]) => R;
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;

// State management types
export interface Action<T = string, P = unknown> {
  type: T;
  payload?: P;
}

export type Reducer<S, A> = (state: S, action: A) => S;

export interface Store<S> {
  getState: () => S;
  dispatch: (action: Action) => void;
  subscribe: (listener: () => void) => () => void;
}

// Form and validation types
export interface ValidationRule<T = unknown> {
  validator: (value: T) => string | null;
  message?: string;
}

export interface ValidationSchema<T = Record<string, unknown>> {
  [K in keyof T]?: ValidationRule<T[K]>[];
}

export interface FormErrors<T = Record<string, unknown>> {
  [K in keyof T]?: string;
}

export interface FormTouched<T = Record<string, unknown>> {
  [K in keyof T]?: boolean;
}

// Theme and styling types
export type ThemeMode = 'light' | 'dark' | 'auto';
export type Language = 'en' | 'zh' | 'ms' | 'ja' | 'ko';

export interface Theme {
  mode: ThemeMode;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, string>;
  breakpoints: Record<string, string>;
}

// Router and navigation types
export interface Route {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
  guards?: string[];
  meta?: {
    title?: string;
    description?: string;
    requiresAuth?: boolean;
    roles?: string[];
  };
}

export interface NavigationItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  children?: NavigationItem[];
  disabled?: boolean;
  hidden?: boolean;
}

// Configuration types
export interface AppConfig {
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    [key: string]: boolean;
  };
  limits: {
    maxFileSize: number;
    maxFiles: number;
    sessionTimeout: number;
  };
  integrations: {
    analytics?: {
      enabled: boolean;
      trackingId?: string;
    };
    monitoring?: {
      enabled: boolean;
      dsn?: string;
    };
  };
}