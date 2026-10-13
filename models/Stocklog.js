import mongoose from 'mongoose';

const stockLogSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    size: { type: String },
    type: { type: String, enum: ['sale', 'return', 'restock', 'adjustment'], required: true },
    quantityChange: { type: Number, required: true }, // negative for sale, positive for restock/return
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    note: { type: String, trim: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } // null = system action (e.g. checkout)
}, { timestamps: true });

stockLogSchema.index({ productId: 1, variantId: 1, createdAt: -1 });

export default mongoose.model('StockLog', stockLogSchema);
