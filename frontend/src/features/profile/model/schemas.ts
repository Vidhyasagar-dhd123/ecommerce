import { z } from 'zod';

// ── Address form schema ────────────────────────────────────────
// Single source of truth — imported by both CheckoutPage and AddressPage
export const addressSchema = z.object({
  name:         z.string().min(2, 'Min 2 characters'),
  street:       z.string().min(5, 'Enter full street address'),
  city:         z.string().min(2),
  state:        z.string().min(2),
  country:      z.string(),
  zipcode:      z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN'),
  address_type: z.enum(['Shipping', 'Billing', 'Other']),
  landmark:     z.string().optional(),
  is_default:   z.boolean(),
});
export type AddressFormValues = z.infer<typeof addressSchema>;

export const ADDRESS_DEFAULT_VALUES: AddressFormValues = {
  name: '', street: '', city: '', state: '',
  country: 'India', zipcode: '', landmark: '',
  address_type: 'Shipping', is_default: false,
};
