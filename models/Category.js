import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    label: { type: String },
    discountPercent: { type: Number, min:1 , max:100 },
    expiryDate: { type: Date},
    isActive: { type: Boolean, default: false}
});

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique:true},
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true},
    description: { type: String, trim: true },
    imageUrl: { type: String},
    status: { type: String, enum: ['active','inactive'], default: 'active'},
    isDeleted:{ type:Boolean , default:false },
    offer: offerSchema,
}, { timestamps: true});

export default mongoose.model('Category',categorySchema);