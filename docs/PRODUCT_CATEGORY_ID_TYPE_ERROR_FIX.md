# Product Creation - Category ID Type Error Fix

## 🔴 Error Analysis

### What's Happening

```
ValidationError: Cast to ObjectId failed for value "books" (type string) at path "category"
POST /api/v1/products 500 Internal Server Error
```

### Root Cause

Your **ProductForm is sending category as a string** (`"books"`, `"electronics"`, etc.), but the backend **expects a MongoDB ObjectId**.

**Backend Model (productModel.js):**
```javascript
category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }
```

**Your Frontend Form:**
```javascript
<Select name="category" value={formData.category} onChange={handleChange}>
  <option value="books">Books & Stationery</option>        // ❌ "books" is a string!
  <option value="electronics">Electronics</option>         // ❌ "electronics" is a string!
</Select>
```

---

## ✅ Solution: Fetch Categories and Use Their IDs

You need to:
1. **Fetch all categories from backend** (which have _id values)
2. **Use category _id values** instead of strings
3. **Update your form options** to show category names but use _id values

### Step 1: Create a Categories Service

**File:** `src/services/categories.js`

```javascript
import api from './api';

const CATEGORIES_ENDPOINT = '/categories';

/**
 * Fetch all categories
 */
export const fetchCategories = async () => {
  try {
    const response = await api.get(CATEGORIES_ENDPOINT);
    console.log('fetchCategories response:', response.data);
    return response.data.data || response.data;
  } catch (error) {
    console.error('fetchCategories error:', error);
    throw error.response?.data || error;
  }
};

/**
 * Fetch category by ID
 */
export const fetchCategoryById = async (id) => {
  try {
    const response = await api.get(`${CATEGORIES_ENDPOINT}/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('fetchCategoryById error:', error);
    throw error.response?.data || error;
  }
};
```

### Step 2: Add Category Hook

**File:** `src/hooks/useCategories.js`

```javascript
import { useQuery } from '@tanstack/react-query';
import * as categoryService from '@/services/categories';

/**
 * Hook for fetching all categories
 */
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.fetchCategories(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
};

/**
 * Hook for fetching category by ID
 */
export const useCategoryById = (id, enabled = true) => {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => categoryService.fetchCategoryById(id),
    enabled: !!id && enabled,
  });
};
```

### Step 3: Update ProductForm.jsx

Replace your category section with this updated version:

```javascript
'use client';

import { useProductForm } from '@/hooks/useProductForm';
import { useCreateProduct, useUpdateProduct, useUserShop } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';  // ← ADD THIS
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorAlert from '@/components/common/ErrorAlert';
import { Upload, X, Plus } from 'lucide-react';
import styled from 'styled-components';

// ... [All your styled components stay the same] ...

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
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();  // ← ADD THIS
  const [tagInput, setTagInput] = useState('');

  // Extract categories array from response
  const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData?.categories || categoriesData?.data || [];
  console.log('Categories loaded:', categories);

  // Auto-fill shop field when userShop is loaded
  React.useEffect(() => {
    if (userShop && userShop._id && !isEditing) {
      handleChange({
        target: { name: 'shop', value: userShop._id }
      });
    }
  }, [userShop, isEditing]);

  const isLoading = createMutation.isPending || updateMutation.isPending || shopLoading || categoriesLoading;
  const error = createMutation.error || updateMutation.error;

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    
    // NEW: Validate category is a valid ObjectId (not empty)
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
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
        const submitData = {
          ...formData,
          shop: formData.shop || userShop?._id,
          // ✅ category is already set as ObjectId from form
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
            disabled={isLoading}
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
            disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </FormGroup>
        </FormGroupDouble>

        {/* Category and Condition - UPDATED */}
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
              disabled={isLoading || categoriesLoading}
            >
              <option value="">
                {categoriesLoading ? 'Loading categories...' : 'Select a category'}
              </option>
              {categories.length > 0 ? (
                categories.map((category) => (
                  <option 
                    key={category._id} 
                    value={category._id}  // ✅ Use _id as value
                  >
                    {category.name}  {/* Display category name */}
                  </option>
                ))
              ) : (
                <option value="">No categories available</option>
              )}
            </Select>
            {errors.category && <ErrorMessage>{errors.category}</ErrorMessage>}
            {categoriesLoading && <HelpText>Loading categories...</HelpText>}
          </FormGroup>

          <FormGroup>
            <Label>Condition</Label>
            <Select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
              disabled={isLoading}
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
            disabled={isLoading}
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
              disabled={isLoading}
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
                      disabled={isLoading}
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
            disabled={isLoading}
          />

          <AddTagButton 
            type="button" 
            onClick={handleAddTag}
            disabled={isLoading}
          >
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
                    disabled={isLoading}
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
        <SubmitButton type="submit" disabled={isLoading || shopLoading || categoriesLoading}>
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

---

## 🔧 Implementation Checklist

### Step 1: Create Service Layer
- [ ] Create `src/services/categories.js` with fetchCategories function
- [ ] Export fetchCategories and fetchCategoryById functions

### Step 2: Create Hooks Layer
- [ ] Create `src/hooks/useCategories.js` with useCategories hook
- [ ] Export both useCategories and useCategoryById

### Step 3: Update ProductForm Component
- [ ] Import `useCategories` from hooks
- [ ] Call useCategories to fetch categories
- [ ] Extract categories from response (handle nested data structure)
- [ ] Update category Select dropdown to map category._id to value
- [ ] Display category.name as the label text
- [ ] Add console.log for debugging if categories don't load

### Step 4: Test
- [ ] Create new product
- [ ] Select a category from dropdown (should show MongoDB IDs as values)
- [ ] Submit form - should succeed ✅

---

## 📊 What Gets Sent to Backend

**Before (Wrong):**
```javascript
{
  name: "Physics Book",
  category: "books",  // ❌ String!
  price: 100
}
```

**After (Correct):**
```javascript
{
  name: "Physics Book",
  category: "507f1f77bcf86cd799439011",  // ✅ MongoDB ObjectId!
  price: 100
}
```

---

## 🎯 Summary

**Problem:** Frontend sends category as string (`"books"`), backend expects MongoDB ObjectId

**Solution:** 
1. Fetch categories from backend API
2. Use category._id as form value
3. Display category.name as label text

**Result:** Products create successfully ✅

**Time to implement:** ~20 minutes
