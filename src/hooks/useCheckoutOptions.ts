import { useState } from 'react';
import { DeliveryOption, PaymentMethod } from '@/types/checkout';

export const useCheckoutOptions = () => {
  const deliveryOptions: DeliveryOption[] = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      description: '3-5 business days',
      price: 50,
      estimatedDays: '3-5 days',
    },
    {
      id: 'express',
      name: 'Express Delivery',
      description: '1-2 business days',
      price: 100,
      estimatedDays: '1-2 days',
    },
  ];

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'payfast',
      name: 'PayFast',
      description: 'Credit Card, Debit Card, EFT',
      icon: 'credit-card',
    },
  ];

  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption>(deliveryOptions[0]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]);

  return {
    deliveryOptions,
    selectedDeliveryOption,
    setSelectedDeliveryOption,
    paymentMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  };
};