import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@netprophet/lib';

export async function POST(request: NextRequest) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Verify that the current user is an admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Check if the current user is an admin
        const { data: adminProfile, error: adminCheckError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (adminCheckError || !adminProfile?.is_admin) {
            return NextResponse.json(
                { success: false, error: 'Admin privileges required' },
                { status: 403 }
            );
        }

        // Prevent admin from deleting themselves
        if (user.id === id) {
            return NextResponse.json(
                { success: false, error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }

        // First, verify the user exists and get their email
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, is_admin')
            .eq('id', id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // If deleting an admin, check if they're the last admin
        if (profile.is_admin) {
            const { count: adminCount, error: countError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_admin', true);

            if (countError) {
                console.error('Error counting admins:', countError);
                return NextResponse.json(
                    { success: false, error: 'Failed to verify admin count' },
                    { status: 500 }
                );
            }

            if (adminCount && adminCount <= 1) {
                return NextResponse.json(
                    { success: false, error: 'Cannot delete the last admin user' },
                    { status: 400 }
                );
            }
        }

        // Delete from profiles table first
        const { error: deleteProfileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (deleteProfileError) {
            console.error('Error deleting from profiles:', deleteProfileError);
            return NextResponse.json(
                { success: false, error: `Failed to delete user profile: ${deleteProfileError.message}` },
                { status: 500 }
            );
        }

        // Delete from Supabase Auth using admin API
        // Note: This requires the service_role key to delete auth users
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(id);

        if (deleteAuthError) {
            console.error('Error deleting from auth:', deleteAuthError);
            // Even if auth deletion fails, we've already deleted the profile
            // We'll return a warning but still consider it successful
            return NextResponse.json(
                { 
                    success: true, 
                    warning: `User profile deleted but auth deletion failed: ${deleteAuthError.message}`,
                    message: 'User profile has been deleted from the database.'
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { 
                success: true, 
                message: 'User successfully deleted from both database and authentication system.'
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error in delete-user API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
