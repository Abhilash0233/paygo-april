import { supabase } from '../../config/supabaseConfig';

// Define the onboarding item interface
export interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  order_number: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Default fallback data if Supabase fetch fails
const fallbackOnboardingData: OnboardingItem[] = [
  {
    id: '1',
    title: 'Find Fitness Centers',
    description: 'Discover the best fitness centers near you with real-time availability.',
    image_url: '',  // Will use local image instead
    order_number: 1,
    active: true
  },
  {
    id: '2',
    title: 'Pay-as-you-go',
    description: 'No monthly commitments. Pay only for the sessions you attend.',
    image_url: '',  // Will use local image instead
    order_number: 2,
    active: true
  },
  {
    id: '3',
    title: 'Start your journey',
    description: 'Book your first session and start your fitness journey today!',
    image_url: '',  // Will use local image instead
    order_number: 3,
    active: true
  }
];

/**
 * Fetch onboarding slides from Supabase
 * @returns Promise<OnboardingItem[]> Array of onboarding items
 */
export async function getOnboardingSlides(): Promise<OnboardingItem[]> {
  try {
    console.log('[Supabase] Fetching onboarding slides...');
    
    const { data, error } = await supabase
      .from('onboarding')
      .select('*')
      .eq('active', true)
      .order('order_number', { ascending: true });
    
    if (error) {
      console.error('[Supabase] Error fetching onboarding slides:', error.message);
      return fallbackOnboardingData;
    }
    
    if (!data || data.length === 0) {
      console.warn('[Supabase] No onboarding slides found, using fallback data');
      return fallbackOnboardingData;
    }
    
    console.log(`[Supabase] Successfully fetched ${data.length} onboarding slides`);
    return data as OnboardingItem[];
  } catch (error) {
    console.error('[Supabase] Exception in getOnboardingSlides:', error);
    return fallbackOnboardingData;
  }
}

/**
 * Add a new onboarding slide
 * @param slide Onboarding item data without id, created_at, updated_at
 * @returns The ID of the newly created slide
 */
export async function addOnboardingSlide(slide: Omit<OnboardingItem, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('onboarding')
      .insert([slide])
      .select('id')
      .single();
    
    if (error) {
      console.error('Error adding onboarding slide to Supabase:', error);
      throw error;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error in addOnboardingSlide:', error);
    throw error;
  }
}

/**
 * Update an existing onboarding slide
 * @param id The slide ID to update
 * @param slideData The data to update
 */
export async function updateOnboardingSlide(id: string, slideData: Partial<OnboardingItem>): Promise<void> {
  try {
    const { error } = await supabase
      .from('onboarding')
      .update({
        ...slideData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating onboarding slide in Supabase:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateOnboardingSlide:', error);
    throw error;
  }
}

/**
 * Delete an onboarding slide
 * @param id The slide ID to delete
 */
export async function deleteOnboardingSlide(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('onboarding')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting onboarding slide from Supabase:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteOnboardingSlide:', error);
    throw error;
  }
} 