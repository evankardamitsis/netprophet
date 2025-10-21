-- Enable real-time for user_power_ups table
ALTER PUBLICATION supabase_realtime
ADD TABLE user_power_ups;

-- Enable real-time for power_ups table (for admin changes)
ALTER PUBLICATION supabase_realtime
ADD TABLE power_ups;
