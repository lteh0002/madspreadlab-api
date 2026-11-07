import mongoose from 'mongoose';

/**
 * A spread between two futures contracts of a product, e.g. J-K 2027 (Apr27-May27).
 * Created (once) the first time a price file for it is uploaded.
 */
const spreadSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    /** Futures month codes joined, e.g. "J-K" */
    spreadName: { type: String, required: true },
    /** Futures month codes, e.g. "J" (Apr), "K" (May) */
    frontMonth: { type: String, required: true },
    backMonth: { type: String, required: true },
    /** Four-digit contract years, e.g. 2027 */
    frontYear: { type: Number, required: true },
    backYear: { type: Number, required: true },
    /** Fair value of the spread, set by hand on some spreads; absent when not known */
    fairValue: { type: Number },
  },
  { versionKey: false },
);

// One spread per product and contract pair
spreadSchema.index(
  { productId: 1, frontMonth: 1, frontYear: 1, backMonth: 1, backYear: 1 },
  { unique: true, name: 'product_contracts_unique' },
);

export const Spread = mongoose.model('Spread', spreadSchema, 'spreads');
