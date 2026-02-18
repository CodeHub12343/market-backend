const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campus must have a name'],
      unique: true,
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Campus must have a location'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
      type: String,
      default: 'default-campus.jpg'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

campusSchema.index({ name: 1 });

const Campus = mongoose.model('Campus', campusSchema);
module.exports = Campus;
