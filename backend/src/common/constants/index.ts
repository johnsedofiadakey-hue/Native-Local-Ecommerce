/**
 * System-wide constants
 * These values are referenced throughout the application
 */

// Order statuses in sequence
export const ORDER_STATUS_FLOW = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
] as const;

// Terminal order statuses (cannot be changed after)
export const TERMINAL_ORDER_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'FAILED',
] as const;

// Merchant verification steps
export const VERIFICATION_STEPS = [
  'ACCOUNT_CREATED',
  'STORE_SETUP',
  'CATEGORY_SELECTED',
  'PAYSTACK_CONNECTED',
  'IDENTITY_SUBMITTED',
  'ADMIN_APPROVED',
] as const;

// Ghana regions
export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Central',
  'Eastern',
  'Western',
  'Western North',
  'Volta',
  'Oti',
  'Northern',
  'North East',
  'Savannah',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
] as const;

// Major cities in Ghana
export const GHANA_CITIES = [
  'Accra',
  'Kumasi',
  'Takoradi',
  'Tamale',
  'Cape Coast',
  'Sunyani',
  'Koforidua',
  'Ho',
  'Wa',
  'Bolgatanga',
  'Tema',
  'Sekondi',
  'Obuasi',
  'Teshie',
  'Techiman',
] as const;

// Store category templates
export const STORE_CATEGORIES = {
  FASHION: {
    name: 'Fashion',
    features: ['size_variants', 'color_variants', 'visual_gallery'],
    requiredFields: ['images', 'sizes', 'colors'],
  },
  ELECTRONICS: {
    name: 'Electronics',
    features: ['specifications', 'warranty', 'reviews'],
    requiredFields: ['specs', 'warranty', 'condition'],
  },
  BEAUTY: {
    name: 'Beauty',
    features: ['ingredients', 'usage_instructions', 'authenticity'],
    requiredFields: ['images', 'authenticity_badge'],
  },
  FOOD: {
    name: 'Food',
    features: ['menu_layout', 'prep_time', 'add_ons'],
    requiredFields: ['prep_time', 'availability'],
  },
  GENERAL_RETAIL: {
    name: 'General Retail',
    features: ['categories', 'search', 'bulk_ordering'],
    requiredFields: ['quantity_selector'],
  },
} as const;

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  STARTER: {
    name: 'Starter',
    price: 29.99,
    features: [
      'Subdomain store',
      'One template',
      'Paystack integration',
      'Basic order tracking',
      'Platform branding',
    ],
  },
  BUSINESS: {
    name: 'Business',
    price: 79.99,
    features: [
      'Custom domain',
      'Multiple templates',
      'Advanced delivery options',
      'Digital receipts',
      'Analytics dashboard',
      'Priority support',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 149.99,
    features: [
      'Everything in Business',
      'High-volume support',
      'Featured listings',
      'Advanced analytics',
      'Dedicated support',
      'Custom integrations',
    ],
  },
} as const;

// Enforcement action severity
export const ENFORCEMENT_SEVERITY = {
  WARNING: 1,
  FEATURE_RESTRICTION: 2,
  STORE_SUSPENSION: 3,
  PERMANENT_BAN: 4,
  IDENTITY_BLACKLIST: 5,
} as const;

// Grace period configurations
export const GRACE_PERIODS = {
  SUBSCRIPTION: 3, // days
  MERCHANT_VERIFICATION: 7, // days
  ORDER_UPDATE: 24, // hours
  DISPUTE_RESPONSE: 48, // hours
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  GHANA_CARD_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  PRODUCT_IMAGE_MAX_SIZE: 2 * 1024 * 1024, // 2MB
  STORE_LOGO_MAX_SIZE: 1 * 1024 * 1024, // 1MB
  STORE_BANNER_MAX_SIZE: 3 * 1024 * 1024, // 3MB
  MAX_PRODUCT_IMAGES: 10,
} as const;

// Rate limiting by endpoint type
export const RATE_LIMITS = {
  AUTH: {
    LOGIN: { ttl: 60, limit: 5 },
    SIGNUP: { ttl: 60, limit: 3 },
    OTP_REQUEST: { ttl: 60, limit: 3 },
    PASSWORD_RESET: { ttl: 300, limit: 3 },
  },
  ORDERS: {
    CREATE: { ttl: 60, limit: 10 },
    UPDATE: { ttl: 60, limit: 30 },
  },
  PAYMENTS: {
    INITIATE: { ttl: 60, limit: 5 },
    VERIFY: { ttl: 60, limit: 10 },
  },
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  GHANA_PHONE: /^\+233(2[0-9]|5[0-9])[0-9]{7}$/,
  GHANA_CARD: /^GHA-\d{9}-\d$/,
  DIGITAL_ADDRESS: /^[A-Z]{2}-\d{3}-\d{4}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_LOCKED: 'Account temporarily locked due to failed login attempts',
    ACCOUNT_BANNED: 'This account has been banned',
    TOKEN_EXPIRED: 'Session expired, please login again',
    UNAUTHORIZED: 'You are not authorized to perform this action',
  },
  MERCHANT: {
    NOT_VERIFIED: 'Merchant verification required',
    SUSPENDED: 'Store is currently suspended',
    PAYSTACK_NOT_CONNECTED: 'Paystack account must be connected',
    INCOMPLETE_SETUP: 'Please complete store setup',
  },
  ORDER: {
    INVALID_STATUS_TRANSITION: 'Invalid order status transition',
    CANNOT_CANCEL: 'Order cannot be cancelled at this stage',
    NOT_FOUND: 'Order not found',
  },
  PAYMENT: {
    VERIFICATION_FAILED: 'Payment verification failed',
    ALREADY_VERIFIED: 'Payment already verified',
    WEBHOOK_INVALID: 'Invalid webhook signature',
  },
} as const;
