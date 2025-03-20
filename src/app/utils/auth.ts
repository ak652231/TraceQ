// utils/auth.ts
"use client";

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { redirect } from 'next/navigation';

// Type for user data
interface User {
  id: string;
  role: string
  // other user properties as needed
}

// Custom hook to handle authentication with cookies
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Set isClient to true once the component is mounted on the client
    setIsClient(true);
  }, []);

  // Function to check if user is authenticated by checking the cookie
  const checkAuth = async () => {
    try {
      if (!isClient) return null;

      // Check for session token in cookies
      const sessionToken = Cookies.get('sessionToken');
      if (!sessionToken) {
        console.log('No session token found');
        setUser(null);
        setLoading(false);
        setAuthInitialized(true);
        return null;
      }
      // Set loading state
      setLoading(true);
      
      // Validate the session token with your API
      const response = await fetch('/api/auth/validate-session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
      });
      
      const userData = response.ok ? await response.json() : null;
      
      // Now safely set the state based on the API response
      if (userData && userData.id) {
        console.log('User authenticated:', userData);
        setUser(userData);
        setLoading(false);
        setAuthInitialized(true);
        return userData;
      } else {
        console.log('Failed to validate session');
        setUser(null);
        setLoading(false);
        setAuthInitialized(true);
        return null;
      }
    } catch (error) {
      console.error('Failed to validate session', error);
      setUser(null);
      setLoading(false);
      setAuthInitialized(true);
      return null;
    }
  };
  
  // Function to redirect unauthorized users
  const requireAuth = async () => {
    // If auth is not initialized yet, wait for it
    if (!authInitialized) {
      await checkAuth();
    }
    
    // Check if user exists after auth initialization
    if (!user && isClient) {
      console.log('No authenticated user in requireAuth, redirecting');
      redirect('/');
      return null;
    }
    
    return user;
  };
  
  // Check auth status on component mount
  useEffect(() => {
    if (isClient) {
      checkAuth();
    }
  }, [isClient]);
  
  return { user, loading, checkAuth, requireAuth, authInitialized };
}