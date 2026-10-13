import * as cartRepository from '../repositories/cartRepository.js';

export const attachCartCount = async (req, res, next) => {
  try {
    if (res.locals.user) {
      res.locals.cartCount = await cartRepository.getCartItemCount(res.locals.user._id);
    } else {
      res.locals.cartCount = 0;
    }
  } catch (err) {
    res.locals.cartCount = 0;
  }
  next();
};