import { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Button component types
export type ButtonVariant = 
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'ghost';

export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

// Input component types
export type InputType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'time';

export type InputSize = 'small' | 'medium' | 'large';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  type?: InputType;
  size?: InputSize;
  error?: boolean;
  errorMessage?: string;
  fullWidth?: boolean;
  className?: string;
}

// Select component types
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: (string | number | SelectOption)[];
  size?: InputSize;
  error?: boolean;
  errorMessage?: string;
  placeholder?: string;
  fullWidth?: boolean;
  className?: string;
}

// Label component types
export type LabelSize = 'small' | 'medium' | 'large';

export interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  htmlFor?: string;
  required?: boolean;
  size?: LabelSize;
  children: ReactNode;
  className?: string;
}

// Form field component types
export type FormFieldType = InputType | 'select';

export interface FormFieldProps {
  label?: string;
  type?: FormFieldType;
  required?: boolean;
  error?: boolean;
  errorMessage?: string;
  helpText?: string;
  id?: string;
  className?: string;
  labelProps?: Partial<LabelProps>;
  inputProps?: Partial<InputProps>;
  selectProps?: Partial<SelectProps>;
  options?: SelectProps['options'];
  [key: string]: unknown; // For additional props to pass through
}

// Card component types
export type CardVariant = 'default' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'small' | 'default' | 'large';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  elevated?: boolean;
  interactive?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

// Notification/Toast types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationData {
  id: number;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

// Layout component types
export interface LayoutProps {
  children: ReactNode;
  className?: string;
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

// Modal/Dialog types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closable?: boolean;
  className?: string;
}

// Table types
export interface TableColumn<T = unknown> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: unknown, record: T, index: number) => ReactNode;
  width?: string | number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface TableProps<T = unknown> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: string | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  className?: string;
}

// Loading/Spinner types
export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

// Error boundary types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: {
    componentStack: string;
  };
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorInfo?: ErrorBoundaryState['errorInfo'];
}