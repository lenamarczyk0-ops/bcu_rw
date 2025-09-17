require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: process.env.ADMIN_EMAIL 
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create admin user
    const admin = new User({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      firstName: 'Administrator',
      lastName: 'Systemu',
      role: 'admin',
      isActive: true,
      isVerified: true
    });

    await admin.save();
    console.log('✅ Admin user created successfully:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD}`);
    console.log(`   Role: ${admin.role}`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

const seedSampleData = async () => {
  try {
    // Create sample users
    const sampleUsers = [
      {
        email: 'wykladowca@bcu-spedycja.pl',
        password: 'Wykladowca123!',
        firstName: 'Jan',
        lastName: 'Kowalski',
        role: 'wykladowca',
        isActive: true,
        isVerified: true
      },
      {
        email: 'redaktor@bcu-spedycja.pl',
        password: 'Redaktor123!',
        firstName: 'Anna',
        lastName: 'Nowak',
        role: 'redaktor',
        isActive: true,
        isVerified: true
      },
      {
        email: 'pracodawca@bcu-spedycja.pl',
        password: 'Pracodawca123!',
        firstName: 'Piotr',
        lastName: 'Wiśniewski',
        role: 'pracodawca',
        companyName: 'Logistics Solutions Sp. z o.o.',
        isActive: true,
        isVerified: true
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Sample user created: ${user.email} (${user.role})`);
      } else {
        console.log(`ℹ️  Sample user already exists: ${userData.email}`);
      }
    }

  } catch (error) {
    console.error('Error creating sample users:', error);
  }
};

const main = async () => {
  console.log('🌱 Starting database seeding...');
  
  await connectDB();
  await seedAdmin();
  
  if (process.env.NODE_ENV === 'development') {
    await seedSampleData();
  }
  
  console.log('✅ Seeding completed!');
  process.exit(0);
};

main().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});

