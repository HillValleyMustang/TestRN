import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const createTestUser = async (): Promise<TestUser | null> => {
  const timestamp = Date.now();
  const testUser: TestUser = {
    email: `testuser+${timestamp}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User'
  };

  try {
    // Sign up the test user
    const { data, error } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          first_name: testUser.firstName,
          last_name: testUser.lastName
        }
      }
    });

    if (error) {
      toast.error('Failed to create test user: ' + error.message);
      return null;
    }

    // Create a profile for the test user
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        toast.error('Failed to create test user profile: ' + profileError.message);
        return null;
      }
    }

    toast.success('Test user created successfully!');
    return testUser;
  } catch (error: any) {
    toast.error('Error creating test user: ' + error.message);
    return null;
  }
};

export const loginTestUser = async (testUser: TestUser) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (error) {
      toast.error('Failed to log in test user: ' + error.message);
      return false;
    }

    toast.success('Test user logged in successfully!');
    return true;
  } catch (error: any) {
    toast.error('Error logging in test user: ' + error.message);
    return false;
  }
};

export const deleteTestUser = async (testUser: TestUser) => {
  try {
    // First, get the user ID
    const { data: { user }, error: fetchError } = await supabase.auth.getUser();
    
    if (fetchError) {
      toast.error('Failed to fetch user: ' + fetchError.message);
      return false;
    }

    if (!user) {
      toast.error('No user found');
      return false;
    }

    // Delete the profile first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      toast.error('Failed to delete profile: ' + profileError.message);
      return false;
    }

    // Note: Supabase doesn't allow deleting users from the client-side
    // You would need to do this from the Supabase dashboard or via a secure server function
    toast.success('Test user profile deleted (user must be deleted manually from Supabase dashboard)');
    return true;
  } catch (error: any) {
    toast.error('Error deleting test user: ' + error.message);
    return false;
  }
};