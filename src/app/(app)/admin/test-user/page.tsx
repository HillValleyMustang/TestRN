"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/components/session-context-provider';
import { createTestUser, loginTestUser, deleteTestUser } from '@/lib/test-user';
import { Copy, UserPlus, LogIn, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TestUserPage() {
  const { session } = useSession();
  const [testUser, setTestUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateTestUser = async () => {
    setLoading(true);
    const user = await createTestUser();
    if (user) {
      setTestUser(user);
    }
    setLoading(false);
  };

  const handleLoginTestUser = async () => {
    if (!testUser) return;
    setLoading(true);
    await loginTestUser(testUser);
    setLoading(false);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleDeleteTestUser = async () => {
    if (!testUser) return;
    setLoading(true);
    await deleteTestUser(testUser);
    setTestUser(null);
    setLoading(false);
  };

  // Only show this page to admins (you can implement proper admin checks)
  if (!session) {
    return <div>Please log in to access this page</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Test User Management</h1>
        <p className="text-muted-foreground">
          Create and manage test users for development and testing purposes.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create Test User</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCreateTestUser} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {loading ? 'Creating...' : 'Create New Test User'}
          </Button>
          
          {testUser && (
            <div className="mt-6 p-4 border rounded-lg bg-muted">
              <h3 className="font-semibold mb-2">Test User Credentials</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="email" 
                      value={testUser.email} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => handleCopyToClipboard(testUser.email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="password" 
                      value={testUser.password} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => handleCopyToClipboard(testUser.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Button 
                  onClick={handleLoginTestUser} 
                  disabled={loading}
                  variant="secondary"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Log In as Test User
                </Button>
                <Button 
                  onClick={handleDeleteTestUser} 
                  disabled={loading}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Test User
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            <li>Test users are created with a timestamp to ensure unique emails</li>
            <li>Passwords are generated automatically and displayed after creation</li>
            <li>Test users have the same privileges as regular users</li>
            <li>Deleting a test user removes their profile but not their Supabase auth record (must be done manually in Supabase dashboard)</li>
            <li>Use this feature only in development environments</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}