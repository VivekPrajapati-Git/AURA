'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';


export async function loginUser(prevState: any, formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Failed to authenticate' };
    }

    // Set secure HTTP-only cookie using Next.js utilities
    const cookieStore = await cookies();
    cookieStore.set('aura-token', data.token, { secure: true, httpOnly: true, path: '/' });
    cookieStore.set('aura-user-id', data.user.id, { secure: true, httpOnly: true, path: '/' });
    cookieStore.set('aura-username', data.user.username || '', { secure: true, path: '/' });

  } catch (err) {
    return { error: 'Network error communicating with the backend' };
  }

  // Redirect after successfully setting cookies (must be outside try-catch to function properly in Next.js)
  redirect('/chat');
}

export async function registerUser(prevState: any, formData: FormData) {
  const username = formData.get('username');
  const email = formData.get('email');
  const password = formData.get('password');

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Failed to register' };
    }

    const cookieStore = await cookies();
    cookieStore.set('aura-token', data.token, { secure: true, httpOnly: true, path: '/' });
    cookieStore.set('aura-user-id', data.user.id, { secure: true, httpOnly: true, path: '/' });
    cookieStore.set('aura-username', data.user.username || '', { secure: true, path: '/' });

  } catch (err) {
    return { error: 'Network error communicating with the backend' };
  }

  redirect('/chat');
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('aura-token');
  cookieStore.delete('aura-user-id');
  cookieStore.delete('aura-username');
  redirect('/login');
}
