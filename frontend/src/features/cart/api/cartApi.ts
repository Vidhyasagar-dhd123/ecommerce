import { axiosInstance } from '@lib/axiosInstance';
import { unwrap } from '@utils/apiHelpers';
import { CartSchema, CouponValidationSchema } from '../model/types';

export const fetchCart = async () => {
  const res = await axiosInstance.get('/api/v1/cart/');
  return CartSchema.parse(unwrap(res));
};

export const addCartItem = async (variantId: number, quantity: number) => {
  const res = await axiosInstance.post('/api/v1/cart/items/', {
    variant_id: variantId,
    quantity,
  });
  return unwrap(res);
};

export const updateCartItem = async (itemId: number, quantity: number) => {
  const res = await axiosInstance.patch(`/api/v1/cart/items/${itemId}/`, { quantity });
  return unwrap(res);
};

export const removeCartItem = async (itemId: number) => {
  await axiosInstance.delete(`/api/v1/cart/items/${itemId}/`);
};

export const clearCart = async () => {
  await axiosInstance.delete('/api/v1/cart/clear/');
};

export const validateCoupon = async (code: string) => {
  const res = await axiosInstance.post('/api/v1/promotions/coupons/validate/', { code });
  const raw = unwrap<any>(res);
  const couponData = raw?.coupon ?? raw;

  return CouponValidationSchema.parse({
    valid: Boolean(couponData?.is_valid ?? true),
    code: String(couponData?.code ?? code),
    discount_type: couponData?.discount_type,
    discount_value: String(couponData?.discount_value ?? '0'),
    message: raw?.message,
    coupon: couponData,
  });
};
