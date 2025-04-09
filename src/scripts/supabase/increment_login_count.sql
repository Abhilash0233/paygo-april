-- Function to increment login count for a user
CREATE OR REPLACE FUNCTION increment_login_count(user_id_param TEXT)
RETURNS INT AS $$
DECLARE
  current_count INT;
BEGIN
  -- Get current login count or default to 0 if not found
  SELECT COALESCE(login_count, 0) INTO current_count 
  FROM users 
  WHERE user_id = user_id_param;
  
  -- If no matching user found, set count to 0
  IF current_count IS NULL THEN
    current_count := 0;
  END IF;
  
  -- Update login count if user exists
  UPDATE users 
  SET login_count = current_count + 1
  WHERE user_id = user_id_param;
  
  -- Return incremented count
  RETURN current_count + 1;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 1 as fallback
    RAISE NOTICE 'Error in increment_login_count: %', SQLERRM;
    RETURN 1;
END;
$$ LANGUAGE plpgsql; 