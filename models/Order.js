// import mongoose from "mongoose";

// const orderItemSchema = new mongoose.Schema({
//   productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
//   variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
//   name: { type: String, required: true },       // snapshot — survives product edits/deletion
//   brand: { type: String },
//   size: { type: String, required: true },
//   image: { type: String },
//   price: { type: Number, required: true },       // price actually charged, per unit
//   quantity: { type: Number, required: true, min: 1 }
// }, { _id: false });

// const orderSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   items: [orderItemSchema],
//   shippingAddress: { type: addressSchema, required: true }, //use user address ref
//   subtotal: { type: Number, required: true },
//   paymentMethod: { type: String, enum: ['cod'], default: 'cod' },
//   status: {
//     type: String,
//     enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
//     default: 'pending'
//   }
// }, { timestamps: true });

// export default mongoose.model('Order', orderSchema);