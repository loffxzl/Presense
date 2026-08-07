import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, required: true, enum: [1, 2, 3, 4, 5] },
  title: { type: String, required: true },
  body: { type: String },
  status: { type: String, required: true, enum: ['approved', 'rejected'], default: 'approved' }
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);