# Next.js Shop CRUD Complete Guide - Styled Components

## 📚 Table of Contents
1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Setup & Configuration](#setup--configuration)
4. [Services](#services)
5. [Custom Hooks](#custom-hooks)
6. [Components](#components)
7. [Pages](#pages)
8. [Error Handling](#error-handling)
9. [Testing](#testing)

---

## Overview

This guide provides complete implementation for Shop CRUD (Create, Read, Update, Delete) operations in your Next.js application using styled-components.

**What we'll build:**
- ✅ Create a shop
- ✅ View all shops
- ✅ View shop details
- ✅ Update shop information
- ✅ Delete a shop
- ✅ Manage shop settings
- ✅ Track shop analytics

---

## API Endpoints

### Shop API Routes

```
GET    /api/v1/shops                 # Get all shops with filters
POST   /api/v1/shops                 # Create a new shop
GET    /api/v1/shops/:id             # Get single shop details
PATCH  /api/v1/shops/:id             # Update shop
DELETE /api/v1/shops/:id             # Delete shop
GET    /api/v1/shops/me              # Get current user's shop
POST   /api/v1/shops/:id/settings    # Update shop settings
GET    /api/v1/shops/:id/analytics   # Get shop analytics
```

---

## Setup & Configuration

### Step 1: Update Environment Variables

**File:** `src/.env.local`

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

### Step 2: Create Directory Structure

```bash
# Create necessary directories
mkdir -p src/components/shops
mkdir -p src/hooks
mkdir -p src/services
mkdir -p src/app/\(protected\)/shops
```

### Step 3: Verify Dependencies

```bash
npm list styled-components react-query axios
```

Should have:
- ✅ styled-components
- ✅ @tanstack/react-query (react-query)
- ✅ axios

---

## Services

### File: `src/services/shops.js`

```javascript
import api from './api';

const SHOPS_ENDPOINT = '/shops';

/**
 * Fetch all shops with optional filters
 * @param {Object} params - Query parameters (page, limit, search, category, etc.)
 * @returns {Promise}
 */
export const fetchShops = async (params = {}) => {
  try {
    const response = await api.get(SHOPS_ENDPOINT, { params });
    console.log('fetchShops response:', response.data);
    return response.data;
  } catch (error) {
    console.error('fetchShops error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Fetch paginated shops
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {Object} filters - Additional filters
 * @returns {Promise}
 */
export const fetchShopsPaginated = async (
  page = 1,
  limit = 12,
  filters = {}
) => {
  try {
    console.log('Fetching shops with params:', { page, limit, filters });
    const response = await api.get(SHOPS_ENDPOINT, {
      params: { page, limit, ...filters },
    });
    console.log('fetchShopsPaginated response:', response.data);
    return response.data;
  } catch (error) {
    console.error('fetchShopsPaginated error:', error.response?.status, error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

/**
 * Fetch single shop by ID
 * @param {string} id - Shop ID
 * @returns {Promise}
 */
export const fetchShopById = async (id) => {
  try {
    const response = await api.get(`${SHOPS_ENDPOINT}/${id}`);
    console.log('fetchShopById response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('fetchShopById error:', error);
    throw error.response?.data || error;
  }
};

/**
 * Fetch current user's shop
 * @returns {Promise}
 */
export const fetchMyShop = async () => {
  try {
    const response = await api.get(`${SHOPS_ENDPOINT}/me`);
    console.log('fetchMyShop response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('fetchMyShop error:', error);
    throw error.response?.data || error;
  }
};

/**
 * Create new shop
 * @param {Object} shopData - Shop data
 * @returns {Promise}
 */
export const createShop = async (shopData) => {
  try {
    const response = await api.post(SHOPS_ENDPOINT, shopData);
    console.log('createShop response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('createShop error:', error);
    throw error.response?.data || error;
  }
};

/**
 * Update shop
 * @param {string} id - Shop ID
 * @param {Object} shopData - Updated shop data
 * @returns {Promise}
 */
export const updateShop = async (id, shopData) => {
  try {
    const response = await api.patch(`${SHOPS_ENDPOINT}/${id}`, shopData);
    console.log('updateShop response:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('updateShop error:', error);
    throw error.response?.data || error;
  }
};

/**
 * Delete shop
 * @param {string} id - Shop ID
 * @returns {Promise}
 */
export const deleteShop = async (id) => {
  try {
    const response = await api.delete(`${SHOPS_ENDPOINT}/${id}`);
    console.log('deleteShop response:', response.data);
    return response.data;
  } catch (error) {
    console.error('deleteShop error:', error);
    throw error.response?.data || error;
  }
};

/**
 * Update shop settings
 * @param {string} id - Shop ID
 * @param {Object} settings - Settings object
 * @returns {Promise}
 */
export const updateShopSettings = async (id, settings) => {
  try {
    const response = await api.post(`${SHOPS_ENDPOINT}/${id}/settings`, settings);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get shop analytics
 * @param {string} id - Shop ID
 * @returns {Promise}
 */
export const getShopAnalytics = async (id) => {
  try {
    const response = await api.get(`${SHOPS_ENDPOINT}/${id}/analytics`);
    return response.data.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Search shops
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise}
 */
export const searchShops = async (query, filters = {}) => {
  try {
    const response = await api.get(SHOPS_ENDPOINT, {
      params: { search: query, ...filters },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
```

---

## Custom Hooks

### File: `src/hooks/useShops.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as shopService from '@/services/shops';

/**
 * Hook for fetching all shops
 */
export const useAllShops = (page = 1, limit = 12, filters = {}) => {
  return useQuery({
    queryKey: ['allShops', page, limit, filters],
    queryFn: async () => {
      try {
        const result = await shopService.fetchShopsPaginated(page, limit, filters);
        console.log('useAllShops result:', result);
        return result;
      } catch (err) {
        console.error('useAllShops error:', err);
        throw err;
      }
    },
    keepPreviousData: true,
  });
};

/**
 * Hook for fetching shop by ID
 */
export const useShopById = (id, enabled = true) => {
  return useQuery({
    queryKey: ['shops', id],
    queryFn: () => shopService.fetchShopById(id),
    enabled: !!id && enabled,
  });
};

/**
 * Hook for fetching current user's shop
 */
export const useMyShop = () => {
  return useQuery({
    queryKey: ['myShop'],
    queryFn: () => shopService.fetchMyShop(),
  });
};

/**
 * Hook for creating shop
 */
export const useCreateShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopData) => shopService.createShop(shopData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allShops'] });
      queryClient.invalidateQueries({ queryKey: ['myShop'] });
    },
  });
};

/**
 * Hook for updating shop
 */
export const useUpdateShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, shopData }) => shopService.updateShop(id, shopData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['allShops'] });
      queryClient.invalidateQueries({ queryKey: ['shops', data._id] });
      queryClient.invalidateQueries({ queryKey: ['myShop'] });
    },
  });
};

/**
 * Hook for deleting shop
 */
export const useDeleteShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => shopService.deleteShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allShops'] });
      queryClient.invalidateQueries({ queryKey: ['myShop'] });
    },
  });
};

/**
 * Hook for searching shops
 */
export const useSearchShops = (query, filters = {}) => {
  return useQuery({
    queryKey: ['searchShops', query, filters],
    queryFn: () => shopService.searchShops(query, filters),
    enabled: !!query,
  });
};

/**
 * Hook for shop analytics
 */
export const useShopAnalytics = (shopId, enabled = true) => {
  return useQuery({
    queryKey: ['shopAnalytics', shopId],
    queryFn: () => shopService.getShopAnalytics(shopId),
    enabled: !!shopId && enabled,
  });
};

/**
 * Hook for updating shop settings
 */
export const useUpdateShopSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, settings }) => shopService.updateShopSettings(id, settings),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shops', data._id] });
      queryClient.invalidateQueries({ queryKey: ['myShop'] });
    },
  });
};
```

---

## Components

### Component 1: ShopCard.jsx

**File:** `src/components/shops/ShopCard.jsx`

```javascript
'use client';

import Link from 'next/link';
import { useState } from 'react';
import styled from 'styled-components';

const CardContainer = styled.div`
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    transform: translateY(-4px);
  }
`;

const ShopImage = styled.div`
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 48px;
`;

const StoreBadge = styled.span`
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: #3b82f6;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
`;

const ContentSection = styled.div`
  padding: 20px;
`;

const ShopName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ShopDescription = styled.p`
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 0;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
`;

const StatItem = styled.div`
  text-align: center;

  .stat-label {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 18px;
    font-weight: 700;
    color: #3b82f6;
  }
`;

const LocationText = styled.p`
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: '📍';
  }
`;

const RatingWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;

  .stars {
    color: #fbbf24;
    font-size: 14px;
  }

  .rating-text {
    font-size: 13px;
    color: #4b5563;
    margin: 0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ViewButton = styled(Link)`
  flex: 1;
  background-color: #3b82f6;
  color: white;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  text-decoration: none;
  transition: background-color 0.3s ease;
  font-weight: 600;
  font-size: 14px;

  &:hover {
    background-color: #2563eb;
  }
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #6b7280;

  &:hover {
    background-color: #f3f4f6;
    border-color: #d1d5db;
  }

  ${props => props.$variant === 'primary' && `
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;

    &:hover {
      background-color: #2563eb;
      border-color: #2563eb;
    }
  `}

  ${props => props.$variant === 'danger' && `
    background-color: #fee2e2;
    color: #dc2626;
    border-color: #fecaca;

    &:hover {
      background-color: #fecaca;
      border-color: #dc2626;
    }
  `}
`;

export default function ShopCard({ shop, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${shop.name}"?`)) {
      onDelete(shop._id);
    }
  };

  return (
    <CardContainer>
      <ShopImage>
        🏪
        <StoreBadge>SHOP</StoreBadge>
      </ShopImage>

      <ContentSection>
        <ShopName>{shop.name}</ShopName>

        <ShopDescription>{shop.description}</ShopDescription>

        <StatsContainer>
          <StatItem>
            <div className="stat-label">Products</div>
            <div className="stat-value">{shop.products || 0}</div>
          </StatItem>
          <StatItem>
            <div className="stat-label">Rating</div>
            <div className="stat-value">{shop.rating || '4.5'}</div>
          </StatItem>
        </StatsContainer>

        {shop.location && (
          <LocationText>{shop.location}</LocationText>
        )}

        {shop.rating && (
          <RatingWrapper>
            <span className="stars">★★★★★</span>
            <p className="rating-text">
              {shop.rating} ({shop.reviewCount || 0} reviews)
            </p>
          </RatingWrapper>
        )}

        <ButtonGroup>
          <ViewButton href={`/shops/${shop._id}`}>
            View Shop
          </ViewButton>

          {(onEdit || onDelete) && (
            <>
              {onEdit && (
                <ActionButton
                  $variant="primary"
                  onClick={() => onEdit(shop._id)}
                >
                  Edit
                </ActionButton>
              )}
              {onDelete && (
                <ActionButton
                  $variant="danger"
                  onClick={handleDelete}
                >
                  Delete
                </ActionButton>
              )}
            </>
          )}
        </ButtonGroup>
      </ContentSection>
    </CardContainer>
  );
}
```

### Component 2: ShopForm.jsx

**File:** `src/components/shops/ShopForm.jsx`

```javascript
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useCreateShop, useUpdateShop } from '@/hooks/useShops';
import ErrorAlert from '@/components/common/ErrorAlert';
import SuccessAlert from '@/components/common/SuccessAlert';

const FormContainer = styled.form`
  background-color: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1f2937;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ErrorText = styled.p`
  color: #dc2626;
  font-size: 13px;
  margin-top: 6px;
  margin-bottom: 0;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #4b5563;
  cursor: pointer;

  input {
    cursor: pointer;
    width: 18px;
    height: 18px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 32px;
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 12px 24px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover:not(:disabled) {
    background-color: #2563eb;
  }

  &:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 12px 24px;
  background-color: white;
  color: #4b5563;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #f3f4f6;
  }
`;

export default function ShopForm({ initialData, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    category: '',
    ...initialData,
  });

  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const createMutation = useCreateShop();
  const updateMutation = useUpdateShop();

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
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
    // Clear error for this field
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
        // Update existing shop
        await updateMutation.mutateAsync({
          id: initialData._id,
          shopData: formData,
        });
      } else {
        // Create new shop
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

### Component 3: ShopGrid.jsx

**File:** `src/components/shops/ShopGrid.jsx`

```javascript
'use client';

import styled from 'styled-components';
import ShopCard from './ShopCard';

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  background-color: #f9fafb;
  border-radius: 12px;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-title {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .empty-text {
    color: #6b7280;
    margin-bottom: 24px;
  }
`;

const LoadingGrid = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
`;

const SkeletonCard = styled.div`
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .skeleton-image {
    height: 200px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
  }

  .skeleton-content {
    padding: 20px;

    .skeleton-line {
      height: 12px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      margin-bottom: 12px;
      border-radius: 4px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const ErrorContainer = styled.div`
  grid-column: 1 / -1;
  padding: 20px;
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  text-align: center;
`;

export default function ShopGrid({
  shops = [],
  isLoading = false,
  error = null,
  onDelete,
  onEdit,
}) {
  if (isLoading) {
    return (
      <LoadingGrid>
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index}>
            <div className="skeleton-image" />
            <div className="skeleton-content">
              <div className="skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton-line" style={{ width: '100%' }} />
              <div className="skeleton-line" style={{ width: '90%' }} />
            </div>
          </SkeletonCard>
        ))}
      </LoadingGrid>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <strong>Error loading shops:</strong> {error?.message || 'Unknown error'}
      </ErrorContainer>
    );
  }

  if (!shops || shops.length === 0) {
    return (
      <EmptyState>
        <div className="empty-icon">🏪</div>
        <div className="empty-title">No shops found</div>
        <p className="empty-text">
          There are no shops to display. Create one to get started!
        </p>
      </EmptyState>
    );
  }

  return (
    <GridContainer>
      {shops.map((shop) => (
        <ShopCard
          key={shop._id}
          shop={shop}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </GridContainer>
  );
}
```

---

## Pages

### Page 1: Shops Listing Page

**File:** `src/app/(protected)/shops/page.js`

```javascript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useAllShops, useDeleteShop } from '@/hooks/useShops';
import ShopGrid from '@/components/shops/ShopGrid';

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 24px;
`;

const MaxWidthContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
`;

const Heading = styled.h1`
  font-size: 32px;
  font-weight: bold;
  margin: 0;
  color: #1f2937;
`;

const AddButton = styled(Link)`
  background-color: #3b82f6;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  transition: background-color 0.3s ease;
  font-weight: 600;

  &:hover {
    background-color: #2563eb;
  }
`;

const SearchForm = styled.form`
  margin-bottom: 24px;
  display: flex;
  gap: 12px;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SearchButton = styled.button`
  padding: 12px 24px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #2563eb;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 32px;
`;

const PaginationButton = styled.button`
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;

  &:hover:not(:disabled) {
    background-color: #f3f4f6;
    border-color: #3b82f6;
  }

  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const DebugBox = styled.div`
  padding: 16px;
  background-color: #f0f0f0;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 12px;
  font-family: monospace;
  max-height: 120px;
  overflow-y: auto;

  div {
    margin-bottom: 6px;
    color: #1f2937;
  }
`;

export default function ShopsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useAllShops(page, 12, {
    search: searchQuery,
  });

  const deleteShop = useDeleteShop();

  // Extract shops from nested data structure
  let shops = [];
  if (data?.data?.shops) {
    shops = data.data.shops;
  } else if (data?.shops) {
    shops = data.shops;
  } else if (Array.isArray(data)) {
    shops = data;
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this shop?')) {
      try {
        await deleteShop.mutateAsync(id);
        alert('Shop deleted successfully');
      } catch (err) {
        alert('Failed to delete shop');
      }
    }
  };

  const handleEdit = (id) => {
    router.push(`/shops/${id}/edit`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <PageContainer>
      <MaxWidthContainer>
        <HeaderContainer>
          <Heading>Shops</Heading>
          <AddButton href="/shops/new">+ Create Shop</AddButton>
        </HeaderContainer>

        <SearchForm onSubmit={handleSearch}>
          <SearchInput
            type="text"
            placeholder="Search shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SearchButton type="submit">Search</SearchButton>
        </SearchForm>

        <DebugBox>
          <div>Status: {isLoading ? 'Loading...' : 'Ready'}</div>
          <div>Shops Found: {shops.length}</div>
          <div>Total Results: {data?.results || 0}</div>
          {error && <div>Error: {error?.message}</div>}
        </DebugBox>

        <ShopGrid
          shops={shops}
          isLoading={isLoading}
          error={error}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />

        {data?.results && shops.length > 0 && (
          <PaginationContainer>
            <PaginationButton
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </PaginationButton>
            <span style={{ padding: '10px 16px' }}>
              Page {page} of {Math.ceil(data.results / 12)}
            </span>
            <PaginationButton
              onClick={() => setPage((p) => p + 1)}
              disabled={shops.length < 12}
            >
              Next
            </PaginationButton>
          </PaginationContainer>
        )}
      </MaxWidthContainer>
    </PageContainer>
  );
}
```

### Page 2: Create/Edit Shop Page

**File:** `src/app/(protected)/shops/[id]/edit/page.js`

```javascript
'use client';

import { useRouter, useParams } from 'next/navigation';
import styled from 'styled-components';
import { useShopById } from '@/hooks/useShops';
import ShopForm from '@/components/shops/ShopForm';

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 24px;
`;

const MaxWidthContainer = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 24px;
  padding: 0;
  font-size: 14px;

  &:hover {
    text-decoration: underline;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

export default function EditShopPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.id;

  const { data: shop, isLoading, error } = useShopById(shopId);

  const handleSuccess = () => {
    router.push('/shops');
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <MaxWidthContainer>
          <LoadingContainer>Loading shop...</LoadingContainer>
        </MaxWidthContainer>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <MaxWidthContainer>
          <LoadingContainer>Error loading shop: {error?.message}</LoadingContainer>
        </MaxWidthContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MaxWidthContainer>
        <BackButton onClick={handleCancel}>← Back</BackButton>
        <ShopForm
          initialData={shop}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </MaxWidthContainer>
    </PageContainer>
  );
}
```

### Page 3: Create New Shop Page

**File:** `src/app/(protected)/shops/new/page.js`

```javascript
'use client';

import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import ShopForm from '@/components/shops/ShopForm';

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 24px;
`;

const MaxWidthContainer = styled.div`
  max-width: 700px;
  margin: 0 auto;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 24px;
  padding: 0;
  font-size: 14px;

  &:hover {
    text-decoration: underline;
  }
`;

export default function CreateShopPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/shops');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <PageContainer>
      <MaxWidthContainer>
        <BackButton onClick={handleCancel}>← Back</BackButton>
        <ShopForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </MaxWidthContainer>
    </PageContainer>
  );
}
```

### Page 4: Shop Details Page

**File:** `src/app/(protected)/shops/[id]/page.js`

```javascript
'use client';

import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useShopById, useDeleteShop } from '@/hooks/useShops';

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 24px;
`;

const MaxWidthContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #3b82f6;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 24px;
  padding: 0;
  font-size: 14px;

  &:hover {
    text-decoration: underline;
  }
`;

const ShopHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 60px 40px;
  border-radius: 12px;
  margin-bottom: 32px;
  text-align: center;

  h1 {
    font-size: 36px;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 18px;
    opacity: 0.9;
    margin: 0;
  }
`;

const ContentContainer = styled.div`
  background-color: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const InfoBlock = styled.div`
  .label {
    font-size: 13px;
    color: #6b7280;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .value {
    font-size: 18px;
    color: #1f2937;
    font-weight: 500;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;

  button {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
  }
`;

const EditButton = styled.button`
  background-color: #3b82f6;
  color: white;

  &:hover {
    background-color: #2563eb;
  }
`;

const DeleteButton = styled.button`
  background-color: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;

  &:hover {
    background-color: #fecaca;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
`;

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.id;

  const { data: shop, isLoading, error } = useShopById(shopId);
  const deleteShop = useDeleteShop();

  const handleEdit = () => {
    router.push(`/shops/${shopId}/edit`);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this shop?')) {
      try {
        await deleteShop.mutateAsync(shopId);
        alert('Shop deleted successfully');
        router.push('/shops');
      } catch (err) {
        alert('Failed to delete shop');
      }
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <MaxWidthContainer>
          <LoadingContainer>Loading shop details...</LoadingContainer>
        </MaxWidthContainer>
      </PageContainer>
    );
  }

  if (error || !shop) {
    return (
      <PageContainer>
        <MaxWidthContainer>
          <LoadingContainer>Error loading shop: {error?.message}</LoadingContainer>
        </MaxWidthContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MaxWidthContainer>
        <BackButton onClick={() => router.back()}>← Back</BackButton>

        <ShopHeader>
          <h1>{shop.name}</h1>
          <p>{shop.description}</p>
        </ShopHeader>

        <ContentContainer>
          <InfoGrid>
            <InfoBlock>
              <div className="label">Location</div>
              <div className="value">{shop.location || 'Not specified'}</div>
            </InfoBlock>

            <InfoBlock>
              <div className="label">Category</div>
              <div className="value">{shop.category || 'General'}</div>
            </InfoBlock>

            <InfoBlock>
              <div className="label">Products</div>
              <div className="value">{shop.productCount || 0}</div>
            </InfoBlock>

            <InfoBlock>
              <div className="label">Rating</div>
              <div className="value">
                ★★★★★ {shop.rating || '4.5'}/5
              </div>
            </InfoBlock>
          </InfoGrid>

          <ActionButtons>
            <EditButton onClick={handleEdit}>Edit Shop</EditButton>
            <DeleteButton onClick={handleDelete}>Delete Shop</DeleteButton>
          </ActionButtons>
        </ContentContainer>
      </MaxWidthContainer>
    </PageContainer>
  );
}
```

---

## Error Handling

### File: `src/lib/errors.js`

```javascript
export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error
    return {
      message: error.response.data?.message || 'An error occurred',
      status: error.response.status,
      code: error.response.data?.code,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response
    return {
      message: 'No response from server. Please check your connection.',
      status: 0,
    };
  } else {
    // Error in request setup
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    };
  }
};

export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.data?.message) return error.data.message;
  return 'An unexpected error occurred';
};
```

---

## Testing

### Complete Testing Checklist

```bash
# 1. Test CREATE SHOP
✅ POST /shops - Create new shop
✅ Verify shop appears in list
✅ Check validation (name required, description required)

# 2. Test READ SHOPS
✅ GET /shops - Get all shops
✅ GET /shops/:id - Get specific shop
✅ Verify pagination works
✅ Test search functionality

# 3. Test UPDATE SHOP
✅ PATCH /shops/:id - Update shop
✅ Verify changes reflect immediately
✅ Test field validation

# 4. TEST DELETE SHOP
✅ DELETE /shops/:id - Delete shop
✅ Verify shop removed from list
✅ Confirm delete works

# 5. Test Frontend Integration
✅ Navigate to /shops
✅ Create a new shop
✅ View shop details
✅ Edit shop information
✅ Delete shop
✅ Verify all data persists correctly
```

---

## File Summary

```
src/
├── components/shops/
│   ├── ShopCard.jsx          # Individual shop card
│   ├── ShopForm.jsx          # Shop creation/edit form
│   └── ShopGrid.jsx          # Grid layout for shops
│
├── hooks/
│   └── useShops.js           # All shop-related hooks
│
├── services/
│   └── shops.js              # Shop API calls
│
└── app/(protected)/shops/
    ├── page.js               # Shops listing page
    ├── new/page.js           # Create shop page
    └── [id]/
        ├── page.js           # Shop details page
        └── edit/page.js      # Edit shop page
```

---

## Next Steps

1. ✅ Copy all files to your project
2. ✅ Update API endpoints if different
3. ✅ Test each CRUD operation
4. ✅ Customize styling as needed
5. ✅ Add additional features

**Complete documentation ready! 🎉**
