const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department must have a name'],
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters']
    },
    code: {
      type: String,
      required: [true, 'Department must have a code'],
      uppercase: true,
      trim: true,
      maxlength: [10, 'Department code cannot exceed 10 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    faculty: {
      type: mongoose.Schema.ObjectId,
      ref: 'Faculty',
      required: [true, 'Department must belong to a faculty']
    },
    campus: {
      type: mongoose.Schema.ObjectId,
      ref: 'Campus',
      required: [true, 'Department must belong to a campus']
    },
    hod: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    image: {
      url: { type: String, default: 'default-department.jpg' },
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
    // Program levels
    programLevels: [{
      type: String,
      enum: ['100', '200', '300', '400', '500', 'postgraduate'],
      default: ['100', '200', '300', '400']
    }],
    // Statistics
    documentsCount: {
      type: Number,
      default: 0
    },
    studentsCount: {
      type: Number,
      default: 0
    },
    lecturesCount: {
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

// Unique compound index for department within a faculty
departmentSchema.index({ faculty: 1, code: 1 }, { unique: true });
departmentSchema.index({ campus: 1, code: 1 });
departmentSchema.index({ name: 'text', description: 'text', code: 'text' });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ faculty: 1, isActive: 1 });

// Pre-populate
departmentSchema.pre(/^find/, function (next) {
  if (this.options.lean === false) {
    this.populate({
      path: 'faculty',
      select: 'name code'
    }).populate({
      path: 'campus',
      select: 'name location'
    }).populate({
      path: 'hod',
      select: 'fullName email'
    });
  }
  next();
});

const Department = mongoose.model('Department', departmentSchema);
module.exports = Department;
