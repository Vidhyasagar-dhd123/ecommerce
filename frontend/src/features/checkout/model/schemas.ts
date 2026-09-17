import { z } from 'zod';
import { addressSchema } from '../../profile/model/schemas';

export { addressSchema };
export type { AddressFormValues } from '../../profile/model/schemas';

// ── Checkout form schema ───────────────────────────────────────
export const checkoutSchema = z.object({
  address_id:     z.number({ required_error: 'Select a delivery address' }),
  payment_method: z.enum(['cod', 'upi', 'netbanking', 'cash'], {
    required_error: 'Select a payment method',
  }),
});
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const PAYMENT_METHODS = [
  { value: 'cod',        label: 'Cash on Delivery' },
  { value: 'upi',        label: 'UPI'               },
  { value: 'netbanking', label: 'Net Banking'        },
  { value: 'cash',       label: 'Cash'               },
] as const;

export type Step = 'address' | 'payment' | 'confirm';
