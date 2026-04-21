const bcrypt = require('bcryptjs');
const User = require('./models/user.model');

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'RESPONSABLE' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = new User({
        nom: 'Admin',
        prenom: 'System',
        email: 'admin@idss.com',
        password: hashedPassword,
        role: 'RESPONSABLE',
        isActive: true
      });
      await newAdmin.save();
      console.log('✅ Default admin created: admin@idss.com / password: admin123');
    }
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  }
};

module.exports = seedAdmin;
