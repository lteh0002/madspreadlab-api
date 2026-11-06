import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    exchange: { type: String, required: true, trim: true, maxlength: 50 },
    currency: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
  },
  { versionKey: false, timestamps: true },
);

// A product name is unique within an exchange; duplicates return 409 via errorHandler.
productSchema.index({ exchange: 1, name: 1 }, { unique: true, name: 'exchange_name_unique' });

export const Product = mongoose.model('Product', productSchema, 'products');
