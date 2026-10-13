import * as couponServivces from '../../services/admin/couponService.js';
import {catchAsync} from '../../utils/catchAsync.js';


export const getCouponList = catchAsync(async (req,res) => {
    const { page = 1 , search = '' } = req.query;

    const data = await couponServivces.getCoupon({page, limit: 10, search});

    return res.render('admin/Coupon',{
        ...data,
        search,
        title:'Coupon',
        adminName: req.session.admin.name
    });
});

export const addCoupon = catchAsync( async (req,res) => {
    const data = req.body;
    
    await couponServivces.createCoupon(data);

    return res.json({success:true});
});

export const editCoupon = catchAsync( async (req, res) => {
    const data = req.body;
    const id = req.params.id;

    await couponServivces.editCoupon(id, data);

    res.json({success:true});
});

export const deleteCoupon = catchAsync( async (req, res) => {
    const id = req.params.id;

    await couponServivces.deleteCoupon(id);
    return res.json({success:true});
});
