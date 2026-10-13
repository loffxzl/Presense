import * as couponRepository from '../../repositories/CouponRepository.js';
import { couponSchema } from '../../validators/admin/couponValidator.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';

export const getCoupon = async ({page = 1, limit = 10, search = ''} = {} ) => {
    const filter = {isDeleted: {$ne:true}};

    if (search.trim()) filter.code = { $regex: new RegExp(search.trim(), 'i') };
    
    const currentPage = Math.max(1,parseInt(page));
    const skip = (currentPage - 1) * limit;
    const sort = { createdAt: -1};

    const [ coupons, totalCoupon ] = await Promise.all([
        couponRepository.findCoupon(filter,sort,skip,limit),
        couponRepository.totalCoupons(filter)
    ])

    const totalPages = Math.ceil(totalCoupon/limit);
    
    return { 
        coupons,
        totalPages,
        search,
        currentPage,
        totalCoupon
    };
};

export const createCoupon = async (data) => {
  const parsed = couponSchema.safeParse(data);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

  const exists = await couponRepository.findCouponByCode(parsed.data.code);
  if (exists) throw new ValidationError('A coupon with this code already exists');

  return couponRepository.createCoupon({
    ...parsed.data,
    code: parsed.data.code.toUpperCase()
  });
};

export const editCoupon = async (id,data) => {

    const parsed = couponSchema.safeParse(data);
    if(!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

    const exists = await couponRepository.findCouponById(id);
    if(!exists) throw new NotFoundError('coupon not found');

    const code = parsed.data.code.toUpperCase();
    if(code !== exists.code){
        const duplicate = await couponRepository.findCouponByCode(code);
        if(duplicate) throw new ValidationError('A coupon with this code already exists')
    }

   return couponRepository.editCoupon(id, { ...parsed.data, code });
};

export const deleteCoupon = async (id) => {
    const exists = await couponRepository.findCouponById(id);
    if(!exists) throw new NotFoundError('coupon doesnt exists');

    return couponRepository.deleteCoupon(id);
};


