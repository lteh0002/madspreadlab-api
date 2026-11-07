import mongoose from 'mongoose';

export const PRODUCT_TYPES = ['indices', 'commodities'];

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    exchange: { type: String, required: true, trim: true, maxlength: 50 },
    currency: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
    /** Which part of the Spreads page the product belongs to */
    productType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: { values: PRODUCT_TYPES, message: 'productType must be "indices" or "commodities"' },
    },
  },
  { versionKey: false, timestamps: true },
);

// A product name is unique within an exchange; duplicates return 409 via errorHandler.
productSchema.index({ exchange: 1, name: 1 }, { unique: true, name: 'exchange_name_unique' });

export const Product = mongoose.model('Product', productSchema, 'products');
