'use client';

import { useActionState } from 'react';
import { loginUser } from '@/app/actions/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginUser, null);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4" bis_skin_checked="1">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl" bis_skin_checked="1">
        
        <div className="text-center mb-8" bis_skin_checked="1">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-zinc-400">Sign in to AURA to continue</p>
        </div>

        <form action={formAction} className="space-y-5">
            <div bis_skin_checked="1">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
                <input 
                    name="email" 
                    type="email" 
                    required 
                    placeholder="Enter your email"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
            </div>

            <div bis_skin_checked="1">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
                <input 
                    name="password" 
                    type="password" 
                    required 
                    placeholder="Enter your password"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
            </div>

            {state?.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm text-center" bis_skin_checked="1">
                    {state.error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={pending}
                className="w-full p-3 mt-4 rounded-xl font-medium tracking-wide bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
                {pending ? 'Authenticating...' : 'Sign In'}
            </button>
        </form>

        <p className="mt-6 text-center text-zinc-400 text-sm">
          Don't have an account?{' '}
          <Link href="/register" className="text-cyan-400 hover:text-cyan-300 ml-1">
            Create an account
          </Link>
        </p>

      </div>
    </div>
  );
}
