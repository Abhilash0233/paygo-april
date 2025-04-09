import { supabase } from '../../config/supabaseConfig';
import { UserProfile, mapUUIDtoPgId } from './userService';
import UUID from 'react-native-uuid';

// Define the necessary types within the file
export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';
export type TimeSlot = string; // Format: "HH:MM AM/PM"

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  BOOKING = 'booking',
  REFUND = 'refund'
}

// Booking interface
export interface Booking {
  id: string;
  bookingId: string;
  userId: string;
  centerId: string;
  centerName: string;
  date: string;
  timeSlot: TimeSlot;
  sessionType: string;
  price: number;
  status: BookingStatus;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  createdAt: string;
  centerImage?: string;
  thumbnailImage?: string;
  severity?: string;
}

/**
 * Helper function to format Supabase URLs properly
 */
const formatSupabaseUrl = (url: string | undefined): string => {
  if (!url) return "";
  
  const SUPABASE_URL = 'https://qzbuzimlrhcchgnldnrv.supabase.co';
  
  // If it's already a full URL, return it
  if (url.startsWith('http')) {
    return url;
  }
  
  // If it's a partial Supabase storage path, add the base URL
  if (url.startsWith('/storage/v1/object/public/')) {
    return `${SUPABASE_URL}${url}`;
  }
  
  // If it's a Supabase storage path without the leading slash
  if (url.startsWith('storage/v1/object/public/')) {
    return `${SUPABASE_URL}/${url}`;
  }
  
  return url;
};

/**
 * Saves a new booking to Supabase
 * @param userId User ID
 * @param centerId Center ID
 * @param date Booking date
 * @param timeSlot Time slot
 * @param sessionType Session type
 * @param price Price of the booking
 * @param centerName Name of the center
 * @returns The created booking object
 */
export async function saveBooking(
  userId: string,
  centerId: string,
  date: string,
  timeSlot: TimeSlot,
  sessionType: string,
  price: number,
  centerName: string
): Promise<Booking | null> {
  try {
    // Special handling for test users (using DEV* or PG* user IDs)
    const isTestUser = userId.startsWith('DEV-') || userId.startsWith('PG-');
    let userProfile;
    
    // Map UUID to PG-formatted ID that exists in the users table
    const userIdToUse = await mapUUIDtoPgId(userId);
    console.log(`Using mapped user ID for booking: ${userIdToUse} (original: ${userId})`);
    
    // Check if user exists in the users table with the user_id we're using
    const { data: userExists, error: userExistsError } = await supabase
      .from('users')
      .select('id, display_name, email, phone_number')
      .eq('user_id', userIdToUse)
      .single();
    
    if (userExistsError) {
      console.log(`User ${userIdToUse} not found in users table. Cannot proceed with booking.`);
      return null; // Fail if user doesn't exist
    }
    
    // Use the profile we found
    userProfile = {
      display_name: userExists.display_name,
      email: userExists.email || '',
      phone_number: userExists.phone_number || ''
    };

    const bookingId = UUID.v4().toString();
    const bookingData = {
      booking_id: bookingId,
      user_id: userIdToUse, // Use the PG-formatted ID (in user_id column) that exists in the users table
      center_id: centerId,
      center_name: centerName,
      date,
      time_slot: timeSlot,
      session_type: sessionType,
      price,
      status: "confirmed" as BookingStatus,
      created_at: new Date().toISOString(),
      user_display_name: userProfile.display_name, // Add user display name for convenience
      user_email: userProfile.email // Add user email for convenience
    };

    // Insert booking data into the bookings table
    const { data, error } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error("Error saving booking:", error);
      
      // Check for specific error types
      if (error.code === '23503') {
        console.error("Foreign key constraint violation. Details:", error.details);
        return null;
      }
      
      return null;
    }

    // Deduct the amount from user's wallet
    await supabase.rpc("add_to_wallet", {
      user_id_param: userIdToUse, // Use the potentially modified user ID (PG- format)
      amount_param: -price,
      transaction_type_param: WalletTransactionType.BOOKING,
      description_param: `Booking at ${centerName} on ${date} - ${timeSlot}`,
    });

    // Format the booking data to match the Booking type
    return {
      id: data.id,
      bookingId: data.booking_id,
      userId: data.user_id,
      centerId: data.center_id,
      centerName: data.center_name,
      date: data.date,
      timeSlot: data.time_slot,
      sessionType: data.session_type,
      price: data.price,
      status: data.status,
      userName: userProfile.display_name,
      userEmail: userProfile.email,
      userPhone: userProfile.phone_number || "",
      createdAt: data.created_at,
      centerImage: data.center_image || "",
      thumbnailImage: data.thumbnail_image || "",
      severity: data.severity || "low",
    };
  } catch (error) {
    console.error("Error in saveBooking:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    } else {
      console.error(`Unknown error type: ${typeof error}`);
    }
    
    return null;
  }
}

/**
 * Retrieves upcoming bookings for a user
 * @param userId User ID
 * @returns Array of upcoming bookings
 */
export async function getUpcomingBookings(userId: string): Promise<Booking[]> {
  try {
    // Map UUID to PG-formatted ID if needed
    const pgFormattedUserId = await mapUUIDtoPgId(userId);
    console.log(`Using mapped user ID for upcoming bookings: ${pgFormattedUserId} (original: ${userId})`);
    
    const today = new Date().toISOString().split("T")[0];

    // Get confirmed bookings for today and future dates
    // Note: Simplified query that doesn't rely on center images join
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", pgFormattedUserId)
      .eq("status", "confirmed")
      .gte("date", today)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching upcoming bookings:", error);
      return [];
    }

    // Get user profile info for the booking
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('display_name, email, phone_number')
      .eq('user_id', pgFormattedUserId)
      .single();
      
    if (userError) {
      console.error("Error fetching user data for bookings:", userError);
    }
    
    const userProfile = userData || { display_name: 'User', email: '', phone_number: '' };

    // Format the booking data
    return data.map((booking: any) => {
      return {
        id: booking.id,
        bookingId: booking.booking_id,
        userId: booking.user_id,
        centerId: booking.center_id,
        centerName: booking.center_name,
        date: booking.date,
        timeSlot: booking.time_slot,
        sessionType: booking.session_type,
        price: booking.price,
        status: booking.status,
        userName: booking.user_display_name || userProfile.display_name,
        userEmail: booking.user_email || userProfile.email,
        userPhone: userProfile.phone_number || "",
        createdAt: booking.created_at,
        centerImage: booking.center_image || "",
        thumbnailImage: booking.thumbnail_image || "",
        severity: booking.severity || "low",
      };
    });
  } catch (error) {
    console.error("Error in getUpcomingBookings:", error);
    return [];
  }
}

/**
 * Retrieves past bookings for a user
 * @param userId User ID
 * @returns Array of past bookings
 */
export async function getPastBookings(userId: string): Promise<Booking[]> {
  try {
    // Map UUID to PG-formatted ID if needed
    const pgFormattedUserId = await mapUUIDtoPgId(userId);
    console.log(`Using mapped user ID for past bookings: ${pgFormattedUserId} (original: ${userId})`);
    
    const today = new Date().toISOString().split("T")[0];

    // Get bookings that are either completed or cancelled and before today
    // Note: Simplified query that doesn't rely on center images join
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", pgFormattedUserId)
      .or(`status.eq.completed,status.eq.cancelled`)
      .lt("date", today)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching past bookings:", error);
      return [];
    }

    // Get user profile info for the booking
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('display_name, email, phone_number')
      .eq('user_id', pgFormattedUserId)
      .single();
      
    if (userError) {
      console.error("Error fetching user data for bookings:", userError);
    }
    
    const userProfile = userData || { display_name: 'User', email: '', phone_number: '' };

    // Format the booking data
    return data.map((booking: any) => {
      return {
        id: booking.id,
        bookingId: booking.booking_id,
        userId: booking.user_id,
        centerId: booking.center_id,
        centerName: booking.center_name,
        date: booking.date,
        timeSlot: booking.time_slot,
        sessionType: booking.session_type,
        price: booking.price,
        status: booking.status,
        userName: booking.user_display_name || userProfile.display_name,
        userEmail: booking.user_email || userProfile.email,
        userPhone: userProfile.phone_number || "",
        createdAt: booking.created_at,
        centerImage: booking.center_image || "",
        thumbnailImage: booking.thumbnail_image || "",
        severity: booking.severity || "low",
      };
    });
  } catch (error) {
    console.error("Error in getPastBookings:", error);
    return [];
  }
}

/**
 * Cancels a booking and processes a refund
 * @param userId User ID
 * @param bookingId Booking ID
 * @returns Success message or error
 */
export async function cancelBooking(
  userId: string,
  bookingId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Map UUID to PG-formatted ID that exists in the users table
    const pgFormattedUserId = await mapUUIDtoPgId(userId);
    console.log(`Using mapped user ID for cancellation: ${pgFormattedUserId} (original: ${userId})`);
    
    // Verify the user exists in the users table with this user_id
    const { data: userExists, error: userExistsError } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', pgFormattedUserId)
      .maybeSingle();
      
    if (userExistsError || !userExists) {
      console.error(`User ${pgFormattedUserId} not found in users table:`, userExistsError);
      return { success: false, message: "User not found" };
    }
    
    // Check if booking exists and belongs to the user
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("user_id", pgFormattedUserId)
      .single();

    if (bookingError || !bookingData) {
      console.error("Booking not found or does not belong to user:", bookingError);
      return { success: false, message: "Booking not found or access denied" };
    }

    if (bookingData.status !== "confirmed") {
      return { 
        success: false, 
        message: "Only confirmed bookings can be cancelled" 
      };
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("booking_id", bookingId)
      .eq("user_id", pgFormattedUserId);

    if (updateError) {
      console.error("Error cancelling booking:", updateError);
      return { success: false, message: "Failed to cancel booking" };
    }

    // Process refund to user's wallet
    const refundAmount = bookingData.price;
    await supabase.rpc("add_to_wallet", {
      user_id_param: pgFormattedUserId,
      amount_param: refundAmount,
      transaction_type_param: WalletTransactionType.REFUND,
      description_param: `Refund for cancelled booking at ${bookingData.center_name}`,
    });

    return { success: true, message: "Booking cancelled successfully. Refund processed." };
  } catch (error) {
    console.error("Error in cancelBooking:", error);
    return { success: false, message: "An error occurred while cancelling the booking" };
  }
}

/**
 * Marks attendance for a booking
 * @param userId User ID
 * @param bookingId Booking ID
 * @param centerId Center ID where attendance is being marked
 * @returns Success message or error
 */
export async function markAttendance(
  userId: string,
  bookingId: string,
  centerId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Map UUID to PG-formatted ID that exists in the users table
    const pgFormattedUserId = await mapUUIDtoPgId(userId);
    console.log(`Using mapped user ID for attendance: ${pgFormattedUserId} (original: ${userId})`);
    
    // Verify the user exists in the users table with this user_id
    const { data: userExists, error: userExistsError } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', pgFormattedUserId)
      .maybeSingle();
      
    if (userExistsError || !userExists) {
      console.error(`User ${pgFormattedUserId} not found in users table:`, userExistsError);
      return { success: false, message: "User not found" };
    }
    
    // Check if booking exists and belongs to the user
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("user_id", pgFormattedUserId)
      .single();

    if (bookingError || !bookingData) {
      console.error("Booking not found or does not belong to user:", bookingError);
      return { success: false, message: "Booking not found or access denied" };
    }

    // Check if the booking is for the correct center
    if (bookingData.center_id !== centerId) {
      return {
        success: false,
        message: "This booking is for a different center",
      };
    }

    // Check if booking is already completed or cancelled
    if (bookingData.status === "completed") {
      return { success: false, message: "Attendance already marked" };
    } else if (bookingData.status === "cancelled") {
      return { success: false, message: "Cannot mark attendance for cancelled booking" };
    }

    // Check if booking date is today
    const today = new Date().toISOString().split("T")[0];
    if (bookingData.date !== today) {
      return {
        success: false,
        message: "Attendance can only be marked on the day of booking",
      };
    }

    // Update booking status to completed
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("booking_id", bookingId)
      .eq("user_id", pgFormattedUserId);

    if (updateError) {
      console.error("Error marking attendance:", updateError);
      return { success: false, message: "Failed to mark attendance" };
    }

    return { success: true, message: "Attendance marked successfully!" };
  } catch (error) {
    console.error("Error in markAttendance:", error);
    return { success: false, message: "An error occurred while marking attendance" };
  }
}
