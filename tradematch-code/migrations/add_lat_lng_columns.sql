-- Add latitude/longitude columns to users table for easy frontend access
ALTER TABLE users ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN longitude DOUBLE PRECISION;

-- Update the RPC to also write lat/lng columns
CREATE OR REPLACE FUNCTION update_user_location(user_id_input UUID, lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS void AS $$
BEGIN
  UPDATE users SET
    location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    latitude = lat,
    longitude = lng
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql;
