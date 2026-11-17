import * as cartRepository from '../repositories/cartRepository.js';
import * as wishlistRepository from '../repositories/wishlistRepository.js';

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

export const attachWishlistCount = async (req, res, next) => {
  try {
    res.locals.wishlistCount = res.locals.user
      ? await wishlistRepository.countVisibleItems(res.locals.user._id)
      : 0;
  } catch (err) {
    res.locals.wishlistCount = 0;
  }
  next();
};