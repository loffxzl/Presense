import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'unlisted'], default: 'active' }
}, { timestamps: true });

brandSchema.index({ name: 1 }, { unique: true });

brandSchema.pre('validate', function () {
    if (this.isModified('name')) {
        this.slug = this.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
});

export default mongoose.model('Brand', brandSchema);