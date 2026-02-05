import { customAlphabet } from 'nanoid';

/**
 * Generate unique order number
 * Format: ORD-XXXXX (e.g., ORD-A1B2C)
 */
export function generateOrderNumber(): string {
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5);
  return `ORD-${nanoid()}`;
}

/**
 * Generate unique tracking ID
 */
export function generateTrackingId(): string {
  const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
  return nanoid();
}

/**
 * Generate store slug from name
 */
export function generateStoreSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate unique subdomain-safe slug
 */
export function generateSubdomainSlug(name: string): string {
  const slug = generateStoreSlug(name);
  const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 4);
  return `${slug}-${nanoid()}`;
}

/**
 * Format Ghana phone number to standard format
 * Accepts: 0241234567, 241234567, +233241234567
 * Returns: +233241234567
 */
export function formatGhanaPhone(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('233')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+233${cleaned.substring(1)}`;
  } else if (cleaned.length === 9) {
    return `+233${cleaned}`;
  }
  
  return phone; // Return original if format not recognized
}

/**
 * Validate Ghana phone number
 */
export function isValidGhanaPhone(phone: string): boolean {
  const formatted = formatGhanaPhone(phone);
  const regex = /^\+233(2[0-9]|5[0-9])[0-9]{7}$/;
  return regex.test(formatted);
}

/**
 * Validate Ghana Card number
 * Format: GHA-XXXXXXXXX-X
 */
export function isValidGhanaCard(cardNumber: string): boolean {
  const regex = /^GHA-\d{9}-\d$/;
  return regex.test(cardNumber);
}

/**
 * Generate OTP code
 */
export function generateOTP(length: number = 6): string {
  const nanoid = customAlphabet('0123456789', length);
  return nanoid();
}

/**
 * Calculate order total
 */
export function calculateOrderTotal(params: {
  subtotal: number;
  deliveryFee: number;
  tax?: number;
  discount?: number;
}): number {
  const { subtotal, deliveryFee, tax = 0, discount = 0 } = params;
  return subtotal + deliveryFee + tax - discount;
}

/**
 * Calculate merchant trust score
 * Based on completion rate, disputes, and order volume
 */
export function calculateTrustScore(params: {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  disputedOrders: number;
}): number {
  const { totalOrders, completedOrders, cancelledOrders, disputedOrders } = params;
  
  if (totalOrders === 0) return 0;
  
  const completionRate = completedOrders / totalOrders;
  const cancellationPenalty = (cancelledOrders / totalOrders) * 0.3;
  const disputePenalty = (disputedOrders / totalOrders) * 0.5;
  
  const score = (completionRate - cancellationPenalty - disputePenalty) * 100;
  
  return Math.max(0, Math.min(100, score)); // Clamp between 0-100
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) return '****';
  return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
}

/**
 * Parse Ghana GPS digital address
 */
export function parseDigitalAddress(address: string): {
  isValid: boolean;
  region?: string;
  district?: string;
  code?: string;
} {
  // Ghana Post GPS format: XX-XXX-XXXX
  const regex = /^([A-Z]{2})-(\d{3})-(\d{4})$/;
  const match = address.match(regex);
  
  if (!match) {
    return { isValid: false };
  }
  
  return {
    isValid: true,
    region: match[1],
    district: match[2],
    code: match[3],
  };
}
