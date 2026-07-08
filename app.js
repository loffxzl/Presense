import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { attachUser } from './middlewares/auth.js';
import passport, { initPassport } from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import adminUserRoutes from './routes/admin/userRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { adminLogout } from './controllers/auth/authController.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();
initPassport();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.use(passport.initialize());
app.use(attachUser);

app.use('/auth', authRoutes);
app.use('/admin/users', adminUserRoutes);
app.use('/', userRoutes);

app.get('/admin/logout', adminLogout);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/`)); 