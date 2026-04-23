// src/utils/validation.js

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const phoneRegex = /^[0-9\s\-\+\(\)]{10,}$/;

export const validators = {
  email: (value) => emailRegex.test(value) ? null : 'Invalid email address',
  
  phone: (value) => {
    if (!value) return null;
    return phoneRegex.test(value) ? null : 'Invalid phone number';
  },
  
  password: (value) => {
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain a number';
    return null;
  },
  
  cgpa: (value) => {
    const cgpa = parseFloat(value);
    if (isNaN(cgpa)) return 'CGPA must be a number';
    if (cgpa < 0 || cgpa > 10) return 'CGPA must be between 0 and 10';
    return null;
  },
  
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Invalid URL';
    }
  },
  
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },
  
  minLength: (length) => (value) => {
    if (!value) return null;
    return value.length < length ? `Minimum ${length} characters required` : null;
  },
  
  maxLength: (length) => (value) => {
    if (!value) return null;
    return value.length > length ? `Maximum ${length} characters allowed` : null;
  },
};

export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  Object.entries(validationRules).forEach(([field, validators]) => {
    if (typeof validators === 'function') {
      const error = validators(formData[field]);
      if (error) errors[field] = error;
    } else if (Array.isArray(validators)) {
      for (const validator of validators) {
        const error = validator(formData[field]);
        if (error) {
          errors[field] = error;
          break;
        }
      }
    }
  });
  
  return errors;
};
