import mongoose from 'mongoose';

/**
 * One OHLC price bar of a spread (with ask/bid volume when the file has it), imported from an uploaded file such as
 * "MCA Oct26-Nov26 Calendar_15min.csv". A series is identified by
 * spreadId + interval; timestamp orders bars within it.
 */
const spreadBarSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    spreadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Spread', required: true },
    /** Bar start time, UTC */
    timestamp: { type: Date, required: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    /** Ask and bid volume of the bar (the file's AVol / BVol columns); absent when not given */
    aVol: { type: Number, min: 0 },
    bVol: { type: Number, min: 0 },
    /** Bar length in minutes, e.g. 15 */
    interval: { type: Number, required: true },
  },
  { versionKey: false },
);

// One bar per spread, interval and time. Also serves time-range queries for a series (timestamp is last).
spreadBarSchema.index(
  { spreadId: 1, interval: 1, timestamp: 1 },
  { unique: true, name: 'spread_interval_timestamp_unique' },
);

export const SpreadBar = mongoose.model('SpreadBar', spreadBarSchema, 'price_data');
