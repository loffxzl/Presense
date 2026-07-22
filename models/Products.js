import mongoose, { mongo } from "mongoose";
import { boolean, trim } from "zod";
import { required } from "zod/mini";

const varientSchema = new mongoose.Schema({
    size: { type: String, required: true},
    stock: { type: Number, required: true, default: 0},
    basePrice: {type: Number, required: true},
    salePrice: {type: Number, required: true},
});

const offerSchema = new mongoose.Schema({
    label: { type: String, required: true},
    discountPercent: { type: Number, required: true},
    isActive: { type: Boolean, required: true},
    expiryDate: { type: Date, required: true},
});

const ratingSchema = new mongoose.Schema({
    average: { type:Number, default: 0},
    count: {type: Number, default: 0}
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true},
    productCode: { type: String, required: true, unique: true, trim: true},
    description: { type: String, trim: true},
    brand: {type: String, required: true, trim: true},
    image: [{ type: String}],
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    concentration: {
        type: String,
        enum: ['Eau de Parfum', 'Extrait de Parfum', 'Eau de Toilette'],
        required: true
    },
    status: { type: String, enum: ['active', 'unlisted'], default: 'active'},
    varients: [varientSchema],
    offer: [offerSchema],
    rating: { type: ratingSchema, default: () => ({ }) }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);