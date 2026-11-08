import mongoose from 'mongoose';

export const PRODUCT_TYPES = ['indices', 'commodities'];

/** How a product's expiry date is worked out each month */
const expiryRuleSchema = new mongoose.Schema(
  {
    /** nthLastTradingDay: n = 1 is the month's last trading day, 2 the one before it */
    type: { type: String, required: true, enum: ['nthLastTradingDay'] },
    n: { type: Number, required: true, min: 1, max: 10 },
  },
  { _id: false },
);

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
    /** Shown on the calendar when set; absent = the product isn't on the calendar */
    expiryRule: { type: expiryRuleSchema, default: undefined },
    /** Trading days shown before expiry on the calendar: 5 = T-5 … T-0 */
    tDays: { type: Number, min: 0, max: 20 },
  },
  { versionKey: false, timestamps: true },
);

// A product name is unique within an exchange; duplicates return 409 via errorHandler.
productSchema.index({ exchange: 1, name: 1 }, { unique: true, name: 'exchange_name_unique' });

export const Product = mongoose.model('Product', productSchema, 'products');
