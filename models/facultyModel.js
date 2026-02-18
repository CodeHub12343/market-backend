const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Faculty must have a name'],
      unique: true,
      trim: true,
      maxlength: [100, 'Faculty name cannot exceed 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Faculty must have a code'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, 'Faculty code cannot exceed 10 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    campus: {
      type: mongoose.Schema.ObjectId,
      ref: 'Campus',
      required: [true, 'Faculty must belong to a campus']
    },
    dean: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    departments: [{
      type: mongoose.Schema.ObjectId,
      ref: 'Department'
    }],
    image: {
      url: { type: String, default: 'default-faculty.jpg' },
      publicId: String
    },
    website: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    // Statistics
    documentsCount: {
      type: Number,
      default: 0
    },
    departmentsCount: {
      type: Number,
      default: 0
    },
    // Status
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes for performance
facultySchema.index({ campus: 1, code: 1 });
facultySchema.index({ name: 'text', description: 'text', code: 'text' });
facultySchema.index({ isActive: 1 });
facultySchema.index({ campus: 1, isActive: 1 });

// Pre-populate
facultySchema.pre(/^find/, function (next) {
  if (this.options.lean === false) {
    this.populate({
      path: 'campus',
      select: 'name location'
    }).populate({
      path: 'dean',
      select: 'fullName email'
    });
  }
  next();
});

const Faculty = mongoose.model('Faculty', facultySchema);
module.exports = Faculty;
