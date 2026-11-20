const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    destinationName: {
      type: String,
      required: [true, 'Destination or site name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      default: '',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    purpose: {
      type: String,
      enum: [
        'CLIENT_MEETING',
        'SITE_INSPECTION',
        'DELIVERY',
        'PAYMENT_COLLECTION',
        'MAINTENANCE',
        'SITE_SURVEY',
        'OTHER',
      ],
      default: 'CLIENT_MEETING',
    },
    workDone: {
      type: String,
      required: [true, 'Work summary or notes are required'],
      trim: true,
    },
    photo: {
      type: String,
      required: [true, 'Site verification photo is required'],
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
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    stopNumber: {
      type: Number,
      default: 1,
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

siteVisitSchema.index({ employee: 1, timestamp: -1 });

const SiteVisit = mongoose.model('SiteVisit', siteVisitSchema);

module.exports = SiteVisit;
