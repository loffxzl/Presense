import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    label: { type: String },
    discountPercent: { type: Number, min:1 , max:100 },
    expiryDate: { type: Date},
    isActive: { type: Boolean, default: false}
});

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true},
    description: { type: String, trim: true },
    imageUrl: { type: String},
    status: { type: String, enum: ['active','inactive'], default: 'active'},
    isDeleted:{ type:Boolean , default:false },
    offer: offerSchema,
}, { timestamps: true});

categorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } } //only enforce uniqueness among documents that aren't soft-deleted
);

categorySchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

export default mongoose.model('Category',categorySchema);