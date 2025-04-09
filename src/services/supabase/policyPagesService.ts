import { supabase } from '../../config/supabaseConfig';
import { RealtimeChannel } from '@supabase/supabase-js';

// Define the policy page interface
export interface PolicyPage {
  id: string;
  title: string;
  content: string;
  slug: string;
  last_updated: string;
  created_at?: string;
  updated_at?: string;
  is_published: boolean;
}

// Enum for page types
export enum PolicyPageType {
  ABOUT_US = 'about-us',
  PRIVACY_POLICY = 'privacy-policy',
  TERMS_AND_CONDITIONS = 'terms-and-conditions',
  CANCELLATION_POLICY = 'cancellation-policy'
}

let subscriptionChannel: RealtimeChannel | null = null;

/**
 * Fetch a specific policy page by its slug
 * @param slug The page slug to fetch
 * @returns Promise<PolicyPage | null> The policy page or null if not found
 */
export async function getPolicyPageBySlug(slug: string): Promise<PolicyPage | null> {
  try {
    const { data, error } = await supabase
      .from('policy_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned error
        console.info(`No policy page found with slug: ${slug}`);
        return null;
      }
      console.error(`Error fetching policy page with slug ${slug}:`, error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getPolicyPageBySlug:', error);
    throw error;
  }
}

/**
 * Fetch all published policy pages
 * @returns Promise<PolicyPage[]> Array of policy pages
 */
export async function getAllPolicyPages(): Promise<PolicyPage[]> {
  try {
    const { data, error } = await supabase
      .from('policy_pages')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching policy pages from Supabase:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getAllPolicyPages:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates for a specific policy page
 * @param slug The page slug to subscribe to
 * @param callback Function to call when the page updates
 * @returns Unsubscribe function
 */
export function subscribeToPolicyPage(slug: string, callback: (page: PolicyPage) => void): () => void {
  try {
    // Unsubscribe from any existing subscription
    if (subscriptionChannel) {
      subscriptionChannel.unsubscribe();
      subscriptionChannel = null;
    }

    // Create a new subscription
    subscriptionChannel = supabase
      .channel(`policy_page_${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'policy_pages',
          filter: `slug=eq.${slug}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            // Handle deletion
            console.info(`Policy page ${slug} was deleted`);
          } else {
            // Get the latest data
            const { data } = await supabase
              .from('policy_pages')
              .select('*')
              .eq('slug', slug)
              .eq('is_published', true)
              .single();
            
            if (data) {
              callback(data);
            }
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      if (subscriptionChannel) {
        subscriptionChannel.unsubscribe();
        subscriptionChannel = null;
      }
    };
  } catch (error) {
    console.error('Error in subscribeToPolicyPage:', error);
    return () => {}; // Return empty function in case of error
  }
} 