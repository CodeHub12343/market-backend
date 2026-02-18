# Shop Creation - Required Fields Error Fix

## 🔴 Error You're Getting

```
ValidationError: A shop must belong to a campus
```

## ❓ What This Means

Your shop creation is **failing** because the backend requires a `campus` field, but your frontend form is not sending it. 

### Backend Requirements (shopModel.js)

The Shop model requires these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **name** | String | ✅ YES | Shop name (you're sending this) |
| **description** | String | ❌ NO | Shop description (optional) |
| **owner** | ObjectId (User) | ✅ YES | Auto-filled from logged-in user |
| **campus** | ObjectId (Campus) | ✅ YES | **YOU'RE MISSING THIS!** |
| **logo** | String | ❌ NO | Shop logo URL (optional) |
| **isVerified** | Boolean | ❌ NO | Default: false |

---

## ✅ Solution

You need to add a `campus` field to your ShopForm. The campus is automatically set based on the user's profile (most campuses assign users to a campus).

### Option 1: Auto-Detect User's Campus (Recommended)

**Step 1: Update your services/shops.js**

```javascript
/**
 * Fetch current user's profile including campus
 */
export const fetchUserProfile = async () => {
  try {
    const response = await api.get('/users/profile');
    return response.data.data;
  } catch (error) {
    console.error('fetchUserProfile error:', error);
    throw error.response?.data || error;
  }
};

/**
 * Create new shop (with campus auto-filled)
 * @param {Object} shopData - Shop data (should include campus)
 * @returns {Promise}
 */
export const createShop = async (shopData) => {
  try {
    // Ensure campus is always sent
    if (!shopData.campus) {
      throw new Error('Campus is required to create a shop');
    }
    
    const response = await api.post(SHOPS_ENDPOINT, shopData);
    console.log('createShop response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('createShop error:', error);
    throw error.response?.data || error;
  }
};
```

**Step 2: Update your hooks/useShops.js**

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as shopService from '@/services/shops';

/**
 * Hook for fetching current user profile
 */
export const useUserProfile = () => {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: () => shopService.fetchUserProfile(),
  });
};

/**
 * Hook for creating shop
 */
export const useCreateShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopData) => {
      // Validate campus is present
      if (!shopData.campus) {
        return Promise.reject(new Error('Campus is required'));
      }
      return shopService.createShop(shopData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allShops'] });
      queryClient.invalidateQueries({ queryKey: ['myShop'] });
    },
  });
};
```

**Step 3: Update your components/shops/ShopForm.jsx**

Replace the imports and update the form:

```javascript
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCreateShop, useUpdateShop, useUserProfile } from '@/hooks/useShops';
import ErrorAlert from '@/components/common/ErrorAlert';
import SuccessAlert from '@/components/common/SuccessAlert';

// ... [keep all styled components the same] ...

export default function ShopForm({ initialData, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    category: '',
    campus: '',  // Add this field
    ...initialData,
  });

  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const createMutation = useCreateShop();
  const updateMutation = useUpdateShop();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();

  const isLoading = createMutation.isPending || updateMutation.isPending || profileLoading;
  const error = createMutation.error || updateMutation.error;

  // Auto-fill campus from user profile when available
  useEffect(() => {
    if (userProfile && userProfile.campus && !initialData) {
      setFormData(prev => ({
        ...prev,
        campus: userProfile.campus._id || userProfile.campus
      }));
    }
  }, [userProfile, initialData]);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        campus: initialData.campus._id || initialData.campus || prev.campus
      }));
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Shop name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Shop name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Shop name cannot exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    // Validate campus is selected
    if (!formData.campus) {
      newErrors.campus = 'Campus is required';
    }

    if (formData.location && formData.location.length > 200) {
      newErrors.location = 'Location cannot exceed 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (initialData?._id) {
        await updateMutation.mutateAsync({
          id: initialData._id,
          shopData: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>
        {initialData?._id ? 'Edit Shop' : 'Create New Shop'}
      </h2>

      {error && (
        <ErrorAlert $show={!!error}>
          {error?.message || 'An error occurred'}
        </ErrorAlert>
      )}

      {showSuccess && (
        <SuccessAlert $show={true}>
          Shop {initialData?._id ? 'updated' : 'created'} successfully!
        </SuccessAlert>
      )}

      <FormGroup>
        <Label htmlFor="name">Shop Name *</Label>
        <Input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter shop name"
          disabled={isLoading}
          maxLength={100}
        />
        {errors.name && <ErrorText>{errors.name}</ErrorText>}
        <small style={{ color: '#6b7280' }}>
          {formData.name.length}/100 characters
        </small>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="description">Description *</Label>
        <TextArea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your shop"
          disabled={isLoading}
          maxLength={500}
        />
        {errors.description && <ErrorText>{errors.description}</ErrorText>}
        <small style={{ color: '#6b7280' }}>
          {formData.description.length}/500 characters
        </small>
      </FormGroup>

      {/* NEW: Campus field */}
      <FormGroup>
        <Label htmlFor="campus">Campus *</Label>
        {userProfile?.campus ? (
          <div style={{ 
            padding: '12px 16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            color: '#1f2937',
            fontWeight: '500'
          }}>
            {userProfile.campus.name || 'Your Campus'}
            <input
              type="hidden"
              name="campus"
              value={formData.campus}
              onChange={handleChange}
            />
          </div>
        ) : (
          <Select
            id="campus"
            name="campus"
            value={formData.campus}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="">Select a campus</option>
            {/* Campus options would be loaded from API */}
          </Select>
        )}
        {errors.campus && <ErrorText>{errors.campus}</ErrorText>}
        <small style={{ color: '#6b7280' }}>
          Campus is auto-detected from your profile
        </small>
      </FormGroup>

      <FieldGrid>
        <FormGroup>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Shop location"
            disabled={isLoading}
            maxLength={200}
          />
          {errors.location && <ErrorText>{errors.location}</ErrorText>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="">Select a category</option>
            <option value="electronics">Electronics</option>
            <option value="books">Books</option>
            <option value="fashion">Fashion</option>
            <option value="food">Food & Beverages</option>
            <option value="services">Services</option>
            <option value="other">Other</option>
          </Select>
        </FormGroup>
      </FieldGrid>

      <FormGroup>
        <CheckboxGroup>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="allowOffers"
              checked={formData.allowOffers || false}
              onChange={handleChange}
              disabled={isLoading}
            />
            Allow customers to make offers
          </CheckboxLabel>
          <CheckboxLabel>
            <input
              type="checkbox"
              name="allowMessages"
              checked={formData.allowMessages || false}
              onChange={handleChange}
              disabled={isLoading}
            />
            Allow direct messages
          </CheckboxLabel>
        </CheckboxGroup>
      </FormGroup>

      <ButtonGroup>
        <SubmitButton type="submit" disabled={isLoading}>
          {isLoading
            ? initialData?._id ? 'Updating...' : 'Creating...'
            : initialData?._id ? 'Update Shop' : 'Create Shop'}
        </SubmitButton>
        <CancelButton
          type="button"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </CancelButton>
      </ButtonGroup>
    </FormContainer>
  );
}
```

---

## 🚀 Quick Fix Checklist

### In your `services/shops.js`:
- [ ] Add validation to check `campus` is sent
- [ ] Update `createShop` function to include campus check

### In your `hooks/useShops.js`:
- [ ] Add `useUserProfile()` hook
- [ ] Update `useCreateShop()` to validate campus

### In your `components/shops/ShopForm.jsx`:
- [ ] Import `useUserProfile`
- [ ] Add `campus` field to form state
- [ ] Add useEffect to auto-fill campus from user profile
- [ ] Add campus input field to form
- [ ] Add campus validation

### Test:
1. Create new shop form
2. Campus should auto-fill from your profile
3. Try submitting - should work now!

---

## 📋 Summary

**The Error:** Your form is missing the `campus` field which is **required** by the backend.

**The Fix:** Add campus field to your form and auto-fill it from the user's profile.

**Time to Fix:** ~10 minutes

**Files to Update:**
1. `services/shops.js` - Add campus validation
2. `hooks/useShops.js` - Add useUserProfile hook
3. `components/shops/ShopForm.jsx` - Add campus field

All code is provided above. Copy and paste!
