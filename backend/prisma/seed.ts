import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('Admin123!@#', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@commercegh.com' },
    update: {},
    create: {
      email: 'admin@commercegh.com',
      phone: '+233200000001',
      phoneVerified: true,
      emailVerified: true,
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create system configuration
  const configs = [
    {
      key: 'PLATFORM_NAME',
      value: { name: 'Ghana Commerce Platform' },
      description: 'Platform display name',
      isPublic: true,
    },
    {
      key: 'MERCHANT_VERIFICATION_REQUIRED',
      value: { required: true },
      description: 'Whether merchant verification is mandatory',
      isPublic: false,
    },
    {
      key: 'SUBSCRIPTION_GRACE_PERIOD_DAYS',
      value: { days: 3 },
      description: 'Grace period before subscription suspension',
      isPublic: false,
    },
    {
      key: 'ORDER_AUTO_COMPLETE_DAYS',
      value: { days: 7 },
      description: 'Days after delivery to auto-complete order',
      isPublic: false,
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  console.log('✅ Created system configuration');

  // Create test merchant (development only)
  if (process.env.NODE_ENV === 'development') {
    const merchantPassword = await bcrypt.hash('Merchant123!', 12);
    
    const merchantUser = await prisma.user.upsert({
      where: { email: 'merchant@test.com' },
      update: {},
      create: {
        email: 'merchant@test.com',
        phone: '+233241234567',
        phoneVerified: true,
        emailVerified: true,
        passwordHash: merchantPassword,
        role: UserRole.MERCHANT,
        isActive: true,
      },
    });

    const merchant = await prisma.merchant.upsert({
      where: { userId: merchantUser.id },
      update: {},
      create: {
        userId: merchantUser.id,
        primaryPhone: '+233241234567',
        businessName: 'Test Fashion Store',
        city: 'Accra',
        area: 'East Legon',
        status: 'VERIFIED',
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
        acceptedTermsAt: new Date(),
      },
    });

    console.log('✅ Created test merchant:', merchantUser.email);

    // Create test store
    const store = await prisma.store.create({
      data: {
        merchantId: merchant.id,
        createdBy: merchantUser.id,
        name: 'ElegantWear Ghana',
        slug: 'elegantwear-gh',
        category: 'FASHION',
        status: 'ACTIVE',
        city: 'Accra',
        area: 'East Legon',
        description: 'Premium fashion for modern Ghanaians',
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    console.log('✅ Created test store:', store.name);

    // Create test products
    const products = [
      {
        name: 'Classic Kente Dress',
        slug: 'classic-kente-dress',
        description: 'Handwoven kente fabric dress, perfect for special occasions',
        price: 250.0,
        isAvailable: true,
        stockQuantity: 15,
        trackInventory: true,
      },
      {
        name: 'Modern African Print Shirt',
        slug: 'modern-african-print-shirt',
        description: 'Contemporary design with traditional African prints',
        price: 85.0,
        isAvailable: true,
        stockQuantity: 30,
        trackInventory: true,
      },
    ];

    for (const product of products) {
      await prisma.product.create({
        data: {
          ...product,
          storeId: store.id,
        },
      });
    }

    console.log('✅ Created test products');
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
