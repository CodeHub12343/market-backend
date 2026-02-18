# Product Creation 403 Error - Complete Fix Guide

## 🔴 Error Analysis

You're getting **403 Forbidden** with message:
```
"You can only create products for your own shop"
```

### Root Cause

Your **ProductForm is NOT sending the `shop` field** to the backend. The backend requires:
- `shop` - which shop this product belongs to (REQUIRED)
- Product name, description, price, etc. (you're sending these)

### Why This Happens

Looking at your ProductForm, you have:
```javascript
const handleSubmit = async (e) => {
  // ... validation ...
  await createMutation.mutateAsync({
    productData: formData,  // ← This doesn't include 'shop'
    images: formData.images,
  });
};
```

But `formData` doesn't have a `shop` field! You need to add it.

---

## ✅ Solution: Add Shop Field to ProductForm

### Step 1: Update your `services/products.js`

Make sure your service includes validation for shop:

```javascript
/**
 * Create new product
 * @param {Object} productData - Product data (must include shop)
 * @param {Array} images - Product images
 * @returns {Promise}
 */
export const createProduct = async (productData, images = []) => {
  try {
    // Validate shop is present
    if (!productData.shop) {
      throw new Error('Shop is required to create a product');
    }

    // Create FormData for multipart request (images + data)
    const formData = new FormData();
    
    // Add product data
    Object.keys(productData).forEach(key => {
      if (key === 'tags' && Array.isArray(productData[key])) {
        productData[key].forEach(tag => {
          formData.append('tags[]', tag);
        });
      } else {
        formData.append(key, productData[key]);
      }
    });

    // Add images
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        if (image instanceof File) {
          formData.append('images', image);
        }
      });
    }

    const response = await api.post(PRODUCTS_ENDPOINT, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('createProduct response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('createProduct error:', error);
    throw error.response?.data || error;
  }
};
```

### Step 2: Update your `hooks/useProducts.js`

Add a hook to fetch user's shop:

```javascript
/**
 * Hook for fetching current user's shop
 */
export const useUserShop = () => {
  return useQuery({
    queryKey: ['userShop'],
    queryFn: async () => {
      try {
        const response = await api.get('/shops/me');
        console.log('User shop:', response.data);
        return response.data.data || response.data;
      } catch (err) {
        console.error('useUserShop error:', err);
        // Return null if user doesn't have a shop yet
        return null;
      }
    },
  });
};

/**
 * Hook for creating product
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productData, images }) => {
      // Validate shop is present
      if (!productData.shop) {
        return Promise.reject(new Error('Shop is required to create a product. Please create a shop first.'));
      }
      return shopService.createProduct(productData, images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProducts'] });
      queryClient.invalidateQueries({ queryKey: ['userProducts'] });
    },
    onError: (error) => {
      console.error('Product creation error:', error);
    },
  });
};
```

### Step 3: Update your `ProductForm.jsx`

This is the main fix - you need to:
1. Import the `useUserShop` hook
2. Auto-fill the shop field
3. Include shop in form submission
4. Fix the styled-components warning

**Replace the entire ProductForm imports and component:**

```javascript
'use client';

import { useProductForm } from '@/hooks/useProductForm';
import { useCreateProduct, useUpdateProduct, useUserShop } from '@/hooks/useProducts';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import { Upload, X, Plus } from 'lucide-react';
import styled from 'styled-components';

// ... [ALL YOUR STYLED COMPONENTS STAY THE SAME] ...

export default function ProductForm({ product = null, isEditing = false }) {
  const router = useRouter();
  const {
    formData,
    errors,
    previewImages,
    handleChange,
    handleImageChange,
    removeImage,
    addTag,
    removeTag,
    setFormErrors,
  } = useProductForm(product);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: userShop, isLoading: shopLoading } = useUserShop();
  const [tagInput, setTagInput] = useState('');

  // Auto-fill shop field when userShop is loaded
  React.useEffect(() => {
    if (userShop && userShop._id && !isEditing) {
      handleChange({
        target: { name: 'shop', value: userShop._id }
      });
    }
  }, [userShop, isEditing]);

  const isLoading = createMutation.isPending || updateMutation.isPending || shopLoading;
  const error = createMutation.error || updateMutation.error;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.category) newErrors.category = 'Category is required';
    
    // NEW: Validate shop is selected
    if (!formData.shop) {
      newErrors.shop = 'You must create a shop before creating products';
    }
    
    if (!isEditing && formData.images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: product._id,
          productData: formData,
          images: formData.images.filter((img) => img instanceof File),
        });
      } else {
        // IMPORTANT: Make sure shop is included
        const submitData = {
          ...formData,
          shop: formData.shop || userShop?._id, // Use auto-filled shop
        };

        await createMutation.mutateAsync({
          productData: submitData,
          images: formData.images,
        });
      }

      router.push('/products');
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      addTag(tagInput);
      setTagInput('');
    }
  };

  // Show error if user doesn't have a shop
  if (!shopLoading && !userShop && !isEditing) {
    return (
      <FormContainer>
        <ErrorAlert
          $show={true}
          message="You must create a shop before creating products. Please create a shop first."
        />
      </FormContainer>
    );
  }

  return (
    <FormContainer onSubmit={handleSubmit}>
      {error && (
        <ErrorAlert
          $show={true}
          message={error.message || 'An error occurred'}
          onClose={() => {}}
        />
      )}

      {/* ===== SECTION 1: BASIC INFO ===== */}
      <FormSection>
        <SectionTitle>
          <SectionIcon>1</SectionIcon>
          Basic Information
        </SectionTitle>

        {/* HIDDEN SHOP FIELD - Auto-filled */}
        <input
          type="hidden"
          name="shop"
          value={formData.shop || userShop?._id || ''}
          onChange={handleChange}
        />

        {/* Shop Display */}
        {userShop && (
          <FormGroup>
            <Label>Your Shop</Label>
            <div style={{ 
              padding: '12px 14px',
              backgroundColor: '#f9f9f9',
              borderRadius: '8px',
              color: '#1a1a1a',
              fontWeight: '500',
              border: '1px solid #e5e5e5'
            }}>
              {userShop.name || 'Your Shop'}
            </div>
            <HelpText>Products will be added to this shop automatically</HelpText>
          </FormGroup>
        )}

        {/* Product Name */}
        <FormGroup>
          <Label>
            Product Name
            <RequiredAsterisk>*</RequiredAsterisk>
          </Label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Physics Textbook"
            $error={!!errors.name}
          />
          {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
        </FormGroup>

        {/* Description */}
        <FormGroup>
          <Label>
            Description
            <RequiredAsterisk>*</RequiredAsterisk>
          </Label>
          <TextArea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide detailed description of your product. Include condition, any defects, features, etc."
            $error={!!errors.description}
          />
          {errors.description && <ErrorMessage>{errors.description}</ErrorMessage>}
          <HelpText>{formData.description.length}/500 characters</HelpText>
        </FormGroup>
      </FormSection>

      {/* ===== SECTION 2: PRICING & DETAILS ===== */}
      <FormSection>
        <SectionTitle>
          <SectionIcon>2</SectionIcon>
          Pricing & Details
        </SectionTitle>

        {/* Price and Quantity */}
        <FormGroupDouble>
          <FormGroup>
            <Label>
              Price
              <RequiredAsterisk>*</RequiredAsterisk>
            </Label>
            <Input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              placeholder="0.00"
              $error={!!errors.price}
            />
            {errors.price && <ErrorMessage>{errors.price}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label>Quantity</Label>
            <Input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              placeholder="1"
            />
          </FormGroup>
        </FormGroupDouble>

        {/* Category and Condition */}
        <FormGroupDouble>
          <FormGroup>
            <Label>
              Category
              <RequiredAsterisk>*</RequiredAsterisk>
            </Label>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              $error={!!errors.category}
            >
              <option value="">Select a category</option>
              <option value="books">Books & Stationery</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing & Fashion</option>
              <option value="furniture">Furniture</option>
              <option value="other">Other</option>
            </Select>
            {errors.category && <ErrorMessage>{errors.category}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label>Condition</Label>
            <Select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
            >
              <option value="new">New - Unused</option>
              <option value="like-new">Like New - Almost unused</option>
              <option value="good">Good - Lightly used</option>
              <option value="fair">Fair - Visibly used</option>
            </Select>
          </FormGroup>
        </FormGroupDouble>

        {/* Location */}
        <FormGroup>
          <Label>Location</Label>
          <Input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., South Campus, Engineering Block"
          />
        </FormGroup>
      </FormSection>

      {/* ===== SECTION 3: IMAGES ===== */}
      <FormSection>
        <SectionTitle>
          <SectionIcon>3</SectionIcon>
          Product Images
        </SectionTitle>

        <ImageUploadWrapper>
          <ImageUploadArea $error={!!errors.images}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
            />
            <UploadIcon>
              <Upload />
            </UploadIcon>
            <UploadText>
              <UploadTitle>Upload images</UploadTitle>
              <UploadSubtitle>PNG, JPG up to 5MB each</UploadSubtitle>
            </UploadText>
          </ImageUploadArea>

          {errors.images && (
            <ErrorMessage style={{ marginTop: '8px' }}>
              {errors.images}
            </ErrorMessage>
          )}

          {previewImages.length > 0 && (
            <>
              <HelpText style={{ marginTop: '4px' }}>
                {previewImages.length} image{previewImages.length !== 1 ? 's' : ''} uploaded
              </HelpText>
              <ImagePreviewGrid>
                {previewImages.map((preview, index) => (
                  <ImagePreviewCard key={index}>
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      style={{ objectFit: 'cover' }}
                    />
                    <RemoveImageButton
                      type="button"
                      onClick={() => removeImage(index)}
                      title="Remove image"
                    >
                      <X />
                    </RemoveImageButton>
                  </ImagePreviewCard>
                ))}
              </ImagePreviewGrid>
            </>
          )}
        </ImageUploadWrapper>
      </FormSection>

      {/* ===== SECTION 4: TAGS ===== */}
      <FormSection>
        <SectionTitle>
          <SectionIcon>4</SectionIcon>
          Tags (Optional)
        </SectionTitle>

        <TagsWrapper>
          <TagInput
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="e.g., 'second hand', 'barely used'"
          />

          <AddTagButton type="button" onClick={handleAddTag}>
            <Plus />
            Add Tag
          </AddTagButton>

          {formData.tags.length > 0 && (
            <TagsList>
              {formData.tags.map((tag) => (
                <Tag key={tag}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    title="Remove tag"
                  >
                    <X />
                  </button>
                </Tag>
              ))}
            </TagsList>
          )}

          <HelpText>
            Tags help buyers find your product. Add up to 5 relevant tags.
          </HelpText>
        </TagsWrapper>
      </FormSection>

      {/* ===== ACTION BUTTONS ===== */}
      <ActionButtonsWrapper>
        <SubmitButton type="submit" disabled={isLoading || shopLoading}>
          {isLoading ? <LoadingSpinner size="sm" /> : null}
          {isLoading
            ? 'Processing...'
            : isEditing
            ? 'Update Product'
            : 'Publish Product'}
        </SubmitButton>
        <CancelButton
          type="button"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </CancelButton>
      </ActionButtonsWrapper>
    </FormContainer>
  );
}
```

### Step 4: Fix the ErrorAlert styled-components Warning

**Update your `components/common/ErrorAlert.jsx`:**

```javascript
import styled from 'styled-components';

const AlertContainer = styled.div`
  padding: 12px 16px;
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  margin-bottom: 16px;
  display: ${props => props.$show ? 'block' : 'none'};
  
  @media (min-width: 768px) {
    padding: 16px 20px;
  }
`;

const AlertTitle = styled.h4`
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  
  @media (min-width: 768px) {
    font-size: 15px;
  }
`;

const AlertMessage = styled.p`
  margin: 0;
  font-size: 13px;
  
  @media (min-width: 768px) {
    font-size: 14px;
  }
`;

export default function ErrorAlert({ $show = false, message, onClose }) {
  return (
    <AlertContainer $show={$show}>
      <AlertTitle>Error</AlertTitle>
      <AlertMessage>{message}</AlertMessage>
    </AlertContainer>
  );
}
```

**Update the usage in ProductForm:**

Change:
```javascript
<ErrorAlert
  message={error.message || 'An error occurred'}
  onClose={() => {}}
/>
```

To:
```javascript
<ErrorAlert
  $show={!!error}
  message={error?.message || 'An error occurred'}
/>
```

---

## 🔧 Quick Implementation Checklist

### Update Services Layer:
- [ ] Add shop validation in `services/products.js` createProduct function
- [ ] Ensure FormData is created properly for multipart requests
- [ ] Include all product fields (shop, name, description, price, category, etc.)

### Update Hooks Layer:
- [ ] Add `useUserShop()` hook to `hooks/useProducts.js`
- [ ] Update `useCreateProduct()` to validate shop exists
- [ ] Add error handling for missing shop

### Update ProductForm Component:
- [ ] Import `useUserShop` hook
- [ ] Add auto-fill effect for shop field
- [ ] Add hidden shop input field
- [ ] Display shop name to user
- [ ] Add shop validation in validateForm
- [ ] Include shop in handleSubmit
- [ ] Fix ErrorAlert prop usage ($show instead of show)

### Update ErrorAlert Component:
- [ ] Use `$show` instead of `show` (transient prop)
- [ ] Update usage throughout app

---

## 📋 Summary

**The Problem:** Shop field was missing from product creation request

**The Solution:**
1. Fetch user's shop with `useUserShop()` hook
2. Auto-fill shop field in form
3. Include shop in form submission
4. Add validation for shop presence
5. Fix styled-components warning with transient props

**Result:** Products will now be automatically linked to user's shop ✅

**Time to implement:** ~15 minutes
