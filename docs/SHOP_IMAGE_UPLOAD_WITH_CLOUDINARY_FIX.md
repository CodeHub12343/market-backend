# Shop Image Upload with Cloudinary - Implementation Fix

## Problem Summary

Your backend is configured to use **Cloudinary** for image uploads, but the frontend is trying to send the `File` object directly in FormData to the shop endpoint. This causes two issues:

1. **Backend doesn't have multer middleware** to handle multipart/form-data
2. **The shopController expects a Cloudinary URL string**, not a File object

## Root Cause

Your backend infrastructure:
- ✅ Has Cloudinary SDK configured
- ✅ Provides `/api/v1/cloudinary/signature` endpoint for image uploads
- ✅ Expects shop `logo` field to be a **String URL**, not a File object
- ❌ Does NOT have multer middleware to receive File objects directly

## Solution: Upload to Cloudinary First

The correct workflow is:

```
1. User selects image in form
2. Frontend gets Cloudinary signature from /api/v1/cloudinary/signature
3. Frontend uploads image directly to Cloudinary using signature
4. Cloudinary returns image URL
5. Frontend sends shop data with logoUrl in FormData
6. Backend receives FormData with logoUrl string (not File object)
```

## Implementation Steps

### Step 1: Update Frontend Service (shops.js)

```javascript
// services/shops.js

import api from './api';
import axios from 'axios';

const SHOPS_ENDPOINT = '/shops';
const CLOUDINARY_SIGNATURE_ENDPOINT = '/cloudinary/signature';
const CLOUDINARY_API = 'https://api.cloudinary.com/v1_1';

/**
 * Upload image to Cloudinary
 */
export const uploadToCloudinary = async (file) => {
  try {
    // Step 1: Get Cloudinary signature from backend
    const { data: signatureData } = await api.get(CLOUDINARY_SIGNATURE_ENDPOINT);
    
    const {
      signature,
      timestamp,
      folder,
      cloudName,
      apiKey
    } = signatureData.data;

    // Step 2: Prepare FormData for Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('signature', signature);
    cloudinaryFormData.append('timestamp', timestamp);
    cloudinaryFormData.append('public_id', `${folder}/${Date.now()}`);
    cloudinaryFormData.append('folder', folder);
    cloudinaryFormData.append('api_key', apiKey);
    cloudinaryFormData.append('eager', 'c_fill,w_200,h_200|c_fill,w_500,h_500');
    cloudinaryFormData.append('eager_async', true);

    // Step 3: Upload directly to Cloudinary (NOT to your backend)
    const response = await axios.post(
      `${CLOUDINARY_API}/${cloudName}/image/upload`,
      cloudinaryFormData
    );

    console.log('Cloudinary upload response:', response.data);
    
    return response.data.secure_url; // Return the image URL
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Create shop with image upload to Cloudinary
 */
export const createShop = async (shopData, logoFile) => {
  try {
    let logoUrl = null;

    // If file provided, upload to Cloudinary first
    if (logoFile) {
      console.log('Uploading logo to Cloudinary...');
      logoUrl = await uploadToCloudinary(logoFile);
      console.log('Cloudinary URL:', logoUrl);
    }

    // Prepare shop data for backend
    const formData = new FormData();

    // Add all shop fields
    Object.keys(shopData).forEach((key) => {
      const value = shopData[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    // Add Cloudinary URL instead of File object
    if (logoUrl) {
      formData.append('logo', logoUrl);
    }

    console.log('Sending shop data to backend:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }

    // POST to backend with Cloudinary URL
    const response = await api.post(SHOPS_ENDPOINT, formData);
    
    return response.data.data.shop;
  } catch (error) {
    console.error('Create shop error:', error);
    throw error;
  }
};

/**
 * Update shop with optional image upload
 */
export const updateShop = async (shopId, updates, logoFile) => {
  try {
    let updateData = { ...updates };

    // If new file provided, upload to Cloudinary first
    if (logoFile) {
      console.log('Uploading new logo to Cloudinary...');
      const logoUrl = await uploadToCloudinary(logoFile);
      updateData.logo = logoUrl;
    }

    const response = await api.patch(`${SHOPS_ENDPOINT}/${shopId}`, updateData);
    return response.data.data.shop;
  } catch (error) {
    console.error('Update shop error:', error);
    throw error;
  }
};

export default {
  createShop,
  updateShop,
  uploadToCloudinary,
  // ... other shop functions
};
```

### Step 2: Update Frontend Component (ShopForm.jsx)

```javascript
// components/ShopForm.jsx

import { useState } from 'react';
import styled from 'styled-components';
import { shopService } from '@/services';
import { useQuery, useMutation } from '@tanstack/react-query';

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 500px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #333;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
  }
`;

const FileInput = styled(Input)`
  padding: 0.5rem;
  cursor: pointer;
`;

const ImagePreview = styled.img`
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
  margin-top: 0.5rem;
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const SuccessMessage = styled.div`
  color: #28a745;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

const UploadingIndicator = styled.div`
  color: #ffc107;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

export default function ShopForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    category: '',
    campus: '',
    allowOffers: true,
    allowMessages: true
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch campuses
  const { data: campusesData } = useQuery({
    queryKey: ['campuses'],
    queryFn: () => shopService.getCampuses(),
  });

  // Create shop mutation
  const createShopMutation = useMutation({
    mutationFn: (data) => shopService.createShop(formData, logoFile),
    onSuccess: (shop) => {
      console.log('Shop created successfully:', shop);
      // Reset form
      setFormData({
        name: '',
        description: '',
        location: '',
        category: '',
        campus: '',
        allowOffers: true,
        allowMessages: true
      });
      setLogoFile(null);
      setLogoPreview(null);
      // Show success message
      alert('Shop created successfully!');
    },
    onError: (error) => {
      console.error('Error creating shop:', error);
      alert(`Error: ${error.response?.data?.message || 'Failed to create shop'}`);
    }
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.campus) {
      alert('Please fill in name and campus');
      return;
    }

    setUploading(true);
    try {
      await createShopMutation.mutateAsync();
    } finally {
      setUploading(false);
    }
  };

  const campuses = campusesData?.data?.campuses || [];

  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormGroup>
        <Label>Shop Name *</Label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g., Abike Clothing Collections"
          required
        />
      </FormGroup>

      <FormGroup>
        <Label>Description</Label>
        <Input
          as="textarea"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Describe your shop"
          rows={4}
        />
      </FormGroup>

      <FormGroup>
        <Label>Location</Label>
        <Input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="Shop location"
        />
      </FormGroup>

      <FormGroup>
        <Label>Campus *</Label>
        <Input
          as="select"
          name="campus"
          value={formData.campus}
          onChange={handleInputChange}
          required
        >
          <option value="">Select Campus</option>
          {campuses.map(campus => (
            <option key={campus._id} value={campus._id}>
              {campus.name}
            </option>
          ))}
        </Input>
      </FormGroup>

      <FormGroup>
        <Label>Logo Image</Label>
        <FileInput
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {logoPreview && (
          <ImagePreview src={logoPreview} alt="Logo preview" />
        )}
        {uploading && (
          <UploadingIndicator>Uploading image to Cloudinary...</UploadingIndicator>
        )}
      </FormGroup>

      <FormGroup>
        <Label>
          <Input
            type="checkbox"
            name="allowOffers"
            checked={formData.allowOffers}
            onChange={handleInputChange}
          />
          Allow offers
        </Label>
      </FormGroup>

      <FormGroup>
        <Label>
          <Input
            type="checkbox"
            name="allowMessages"
            checked={formData.allowMessages}
            onChange={handleInputChange}
          />
          Allow messages
        </Label>
      </FormGroup>

      {createShopMutation.error && (
        <ErrorMessage>
          {createShopMutation.error?.response?.data?.message || 'An error occurred'}
        </ErrorMessage>
      )}

      {createShopMutation.isSuccess && (
        <SuccessMessage>Shop created successfully!</SuccessMessage>
      )}

      <SubmitButton
        type="submit"
        disabled={uploading || createShopMutation.isPending}
      >
        {uploading || createShopMutation.isPending ? 'Creating...' : 'Create Shop'}
      </SubmitButton>
    </FormContainer>
  );
}
```

## Backend Changes Required

### Ensure cloudinary.js is properly configured

File: `config/cloudinary.js`

```javascript
const cloudinary = require('cloudinary').v2;

// Check if Cloudinary is configured
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('⚠️ Cloudinary not fully configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
```

### Update shopModel.js to ensure logo field is String

```javascript
// models/shopModel.js

const shopSchema = new Schema({
  // ... other fields ...
  logo: {
    type: String,  // ← Cloudinary URL (String, not File)
    default: null
  },
  // ... other fields ...
});
```

## Environment Variables Required

Ensure your `.env` file has:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_PRODUCT_FOLDER=products
CLOUDINARY_SHOP_FOLDER=shops
```

## How It Works - Step by Step

### 1. User selects image in form
```
User clicks file input → Selects image.jpg
```

### 2. Frontend requests Cloudinary signature from backend
```
GET /api/v1/cloudinary/signature
↓
Backend returns: {
  signature: "abc123...",
  timestamp: 1704067200,
  cloudName: "your_cloud",
  apiKey: "your_key",
  folder: "shops"
}
```

### 3. Frontend uploads directly to Cloudinary
```
POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload
Body: {
  file: <image.jpg>,
  signature: "abc123...",
  timestamp: 1704067200,
  api_key: "your_key",
  folder: "shops",
  ...
}
↓
Cloudinary returns: {
  public_id: "shops/1234567890",
  secure_url: "https://res.cloudinary.com/.../image.jpg",
  ...
}
```

### 4. Frontend sends shop data with Cloudinary URL to backend
```
POST /api/v1/shops
Body: FormData {
  name: "Abike Clothing Collections",
  description: "...",
  campus: "68e5d74b9e9ea2f53162e9ae",
  logo: "https://res.cloudinary.com/.../image.jpg",  ← String URL, not File!
  ...
}
```

### 5. Backend creates shop with image URL
```
Shop created with:
{
  _id: ObjectId("..."),
  name: "Abike Clothing Collections",
  logo: "https://res.cloudinary.com/.../image.jpg",  ← String
  ...
}
```

## Advantages of This Approach

✅ **No multer configuration needed** - Backend stays clean
✅ **Image optimization** - Cloudinary handles resizing, compression
✅ **CDN delivery** - Cloudinary serves images from edge locations
✅ **Matches your infrastructure** - You already have Cloudinary configured
✅ **Secure** - Signature is generated server-side, frontend can't fake uploads
✅ **Scalable** - Cloudinary handles storage, not your server

## Testing the Fix

1. Update `services/shops.js` with the new `uploadToCloudinary` and `createShop` functions
2. Update the component to use the new service
3. Test:
   ```
   1. Select image file
   2. Click "Create Shop"
   3. Check browser console:
      - "Uploading logo to Cloudinary..."
      - "Cloudinary upload response: {...secure_url...}"
      - "Sending shop data to backend: {...logo: https://...}"
   4. Backend should receive FormData with logo as String URL
   5. Shop creation should succeed
   ```

## Troubleshooting

**Issue: "Cloudinary API Secret missing" error**
- Solution: Add `CLOUDINARY_API_SECRET` to `.env`

**Issue: Cloudinary upload fails with 401**
- Solution: Verify `CLOUDINARY_API_KEY` and signature are correct

**Issue: Backend still says "logo missing"**
- Solution: Check that logo is being appended as string, not File object:
  ```javascript
  // ✅ Correct
  formData.append('logo', 'https://res.cloudinary.com/...');
  
  // ❌ Wrong
  formData.append('logo', File);
  ```

## Summary

Your backend is already perfectly configured for Cloudinary! The issue is just that the frontend needs to upload images to Cloudinary first (using the signature endpoint), then send the resulting URL to your shop endpoint. This is the standard pattern for Cloudinary integrations and works perfectly with your existing setup.
