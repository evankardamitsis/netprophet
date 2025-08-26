import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Check if environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', { 
      supabaseUrl: supabaseUrl ? 'Set' : 'Missing', 
      serviceRoleKey: serviceRoleKey ? 'Set' : 'Missing' 
    });

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', { supabaseUrl, serviceRoleKey });
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error: Missing environment variables' 
      }, { status: 500 });
    }

    // Initialize Supabase client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await request.json();
    console.log('Request body:', body);
    
    const { id, username, is_admin, suspended, balance } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing user ID' 
      }, { status: 400 });
    }

    console.log('Admin updating user:', { id, username, is_admin, suspended, balance });

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        username: username ?? '', 
        is_admin, 
        suspended, 
        balance 
      })
      .eq('id', id)
      .select();

    console.log('Admin update result:', { data, error });

    if (error) {
      console.error('Admin update error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Admin update API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
