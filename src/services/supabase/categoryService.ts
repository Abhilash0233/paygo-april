/**
 * Supabase Category Service
 * 
 * This file contains functions to handle category data in Supabase
 */

import { supabase } from '../../config/supabaseConfig';

// Define Category interface
export interface Category {
  id: string;
  name: string;
  color: string;
  image?: string | null;
  created_at?: string;
}

/**
 * Fetch all categories from Supabase
 */
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    console.log('Fetching categories from Supabase...');
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No categories found in Supabase');
      return [];
    }
    
    console.log(`Successfully fetched ${data.length} categories from Supabase`);
    return data as Category[];
  } catch (error) {
    console.error('Error fetching categories from Supabase:', error);
    return [];
  }
};

/**
 * Fetch a single category by ID
 */
export const fetchCategoryById = async (categoryId: string): Promise<Category | null> => {
  try {
    console.log(`Fetching category from Supabase with ID: ${categoryId}`);
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();
    
    if (error) {
      console.error(`Error fetching category with ID ${categoryId}:`, error);
      return null;
    }
    
    if (!data) {
      console.log(`No category found with ID: ${categoryId}`);
      return null;
    }
    
    return data as Category;
  } catch (error) {
    console.error(`Error fetching category with ID ${categoryId}:`, error);
    return null;
  }
};

/**
 * Fetch multiple categories by their IDs
 */
export const fetchCategoriesByIds = async (categoryIds: string[]): Promise<Category[]> => {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }
  
  try {
    console.log(`Fetching ${categoryIds.length} categories from Supabase by IDs`);
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .in('id', categoryIds);
    
    if (error) {
      console.error('Error fetching categories by IDs:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No categories found for the provided IDs');
      return [];
    }
    
    console.log(`Successfully fetched ${data.length} categories by IDs`);
    return data as Category[];
  } catch (error) {
    console.error('Error fetching categories by IDs from Supabase:', error);
    return [];
  }
}; 