
import { CartItem } from '@/contexts/CartContext';

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  price: number;
  description: string;
  estimatedDays: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  accountHolder: string;
}

export interface BankAccountFormData extends BankAccount {
  isDefault?: boolean;
}

export interface BankAccountWithId extends BankAccount {
  id: string;
  createdAt: string;
  isDefault: boolean;
}

export const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
};

export const initialBankAccountFormData: BankAccountFormData = {
  bankName: '',
  accountNumber: '',
  branchCode: '',
  accountType: 'Current',
  accountHolder: '',
  isDefault: true
};