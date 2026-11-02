import mongoose from "mongoose";

const { Schema } = mongoose;

const orderItemSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        variantId: { type: Schema.Types.ObjectId, required: true },

        name: { type: String, required: true },
        brand: { type: String, required: true },
        image: { type: String },
        size: { type: String, required: true },

        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        lineTotal: { type: Number, required: true },

        status: {
            type: String,
            enum: ["active", "cancelled", "returned"],
            default: "active",
        },
        cancelReason: { type: String, trim: true },
        cancelledAt: { type: Date },
    },
    { _id: false }
);

const orderAddressSchema = new Schema(
    {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        line1: { type: String, required: true },
        line2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, required: true },
    },
    { _id: false }
);

const orderSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        orderCode: { type: String, required: true, unique: true },

        items: [orderItemSchema],
        shippingAddress: { type: orderAddressSchema, required: true },

        pricing: {
            subtotal: { type: Number, required: true },
            tax: { type: Number, required: true, default: 0 },
            discount: { type: Number, required: true, default: 0 },
            shippingFee: { type: Number, required: true, default: 0 },
            total: { type: Number, required: true },
        },

        couponCode: { type: String, trim: true, uppercase: true },

        // --- Payment (added for Razorpay) ---
        // Existing orders have none of these fields; the defaults below mean
        // they read as plain COD / unpaid without any data migration.
        paymentMethod: {
            type: String,
            enum: ["COD", "RAZORPAY", "WALLET"],
            default: "COD",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        razorpayOrderId: { type: String, trim: true },
        razorpayPaymentId: { type: String, trim: true },
        paidAt: { type: Date },

        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "shipped",
                "delivered",
                "cancelled",
                "return_requested",
                "return_approved",
                "return_rejected",
                "return_pickup",
                "return_in_transit",
                "return_received",
                "refunded",
            ],
            default: "pending",
        },

        statusHistory: {
            type: [
                {
                    status: { type: String, required: true },
                    changedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
                    note: { type: String, trim: true },
                    changedAt: { type: Date, default: Date.now },
                },
            ],
            default: [],
        },

        cancelReason: { type: String, trim: true },
        cancelledAt: { type: Date },

        returnReason: { type: String, trim: true },
        returnRequestedAt: { type: Date },


        deliveredAt: { type: Date },
        returnApprovedAt: { type: Date },
        returnRejectedAt: { type: Date },
        rejectionReason: { type: String, trim: true },
        returnPickedUpAt: { type: Date },
        returnInTransitAt: { type: Date },
        returnReceivedAt: { type: Date },
        refundedAt: { type: Date },


        refundedAmount: { type: Number, default: 0 },


        idempotencyKey: { type: String, trim: true, maxlength: 100 },
    },
    { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });


orderSchema.index(
    { userId: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export default mongoose.model("Order", orderSchema);