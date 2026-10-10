const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'] 
  },
  role: { 
    type: String, 
    enum: ['candidate', 'recruiter'], 
    default: 'candidate',
    required: true 
  },
  companyName: { 
    type: String, 
    trim: true,
    default: '' 
  },
  headline: { 
    type: String, 
    trim: true,
    default: '' 
  },
  phone: { 
    type: String, 
    trim: true,
    default: '' 
  },
  bio: { 
    type: String, 
    default: '' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Remove password when converting to JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
