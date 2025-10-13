/**
 * API Helper Functions for Settings Tab
 * Calls Next.js API routes on the web app
 */

const getApiBaseUrl = () => {
  const domain = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
  if (domain) {
    return `https://${domain}`;
  }
  // Fallback for local development
  return 'http://localhost:5000';
};

interface GenerateTPathParams {
  tPathId: string;
  preferred_session_length?: string;
}

/**
 * Calls /api/generate-t-path to regenerate workout plans
 * Requires Authorization header with session access token
 */
export async function postGenerateTPath(
  params: GenerateTPathParams,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/generate-t-path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[API] postGenerateTPath error:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}
