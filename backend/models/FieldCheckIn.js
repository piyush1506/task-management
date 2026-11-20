const mongoose = require('mongoose');

const fieldCheckInSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    photo: {
      type: String,
      required: [true, 'Selfie/Site verification photo is required'],
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    address: {
      type: String,
      default: 'Location address unavailable',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: 'India',
    },
    type: {
      type: String,
      enum: ['CHECK_IN', 'CHECK_OUT'],
      default: 'CHECK_IN',
      index: true,
    },
    purpose: {
      type: String,
      enum: [
        'CLIENT_VISIT',
        'SITE_INSPECTION',
        'DELIVERY',
        'MARKETING',
        'MAINTENANCE',
        'OFFICE_COMMUTE',
        'OFFSITE_MEETING',
        'DELIVERY_DISPATCH',
        'SHIFT_START',
        'SHIFT_END',
        'OTHER',
      ],
      default: 'CLIENT_VISIT',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

fieldCheckInSchema.index({ latitude: 1, longitude: 1 });

const FieldCheckIn = mongoose.model('FieldCheckIn', fieldCheckInSchema);

module.exports = FieldCheckIn;

