// import mongoose from 'mongoose';
// import bcrypt from 'bcrypt';
// import User from './models/User.js';

// const seed = async () => {
//   await mongoose.connect(process.env.MONGO_URI);

//   await User.deleteMany({ role: 'user' }); // only clears users, keeps admin

//   const passwordHash = await bcrypt.hash('User@123', 10);

//   const users = [];
//   for (let i = 1; i <= 25; i++) {
//     users.push({
//       name: `Test User ${i}`,
//       email: `user${i}@mail.com`,
//       passwordHash,
//       role: 'user',
//       status: i % 5 === 0 ? 'blocked' : 'active',
//       isEmailVerified: true
//     });
//   }

//   await User.insertMany(users);
//   console.log('25 users seeded');
//   process.exit();
// };

// seed();