'use client';

import { useState } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import dynamic from 'next/dynamic';

// Dynamically import the voice assistant to avoid SSR issues
const VoiceAssistant = dynamic(() => import('@/components/VoiceAssistant'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-white/5 rounded-3xl w-full h-[300px]" />
  ),
});

export default function HomePage() {
  const [isVoiceAssistantActive, setIsVoiceAssistantActive] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="flex min-h-screen">
        {/* Content Section - Left Side */}
        <div className="flex-1 relative isolate px-6 pt-14 lg:px-8 overflow-y-auto">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="mx-auto max-w-3xl py-24 sm:py-32">
            <div className="text-center">
              <div className="relative z-10 mb-4 inline-flex items-center gap-2 rounded-full bg-gray-900/50 px-6 py-2 backdrop-blur-xl">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-pink-500"></span>
                <p className="text-sm text-gray-300">Meet Your New 24/7 Partner in Crime</p>
              </div>
              
              <h1 className="relative z-10 mb-8 text-4xl font-bold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-400 to-blue-500">
                The Assistant That Actually Gets{' '}
                <span className="text-pink-500">Sh*t</span>{' '}
                Done
              </h1>
              
              <p className="relative z-10 mx-auto max-w-2xl text-lg leading-8 text-gray-300">
                She's in your WhatsApp, email, and calls. She's your calendar ninja, presentation pro, and email whisperer. And she never, ever takes a day off.
              </p>

              <div className="mt-10 flex items-center justify-center gap-6">
                <button
                  onClick={() => setIsVoiceAssistantActive(true)}
                  className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105"
                >
                  <MicrophoneIcon className="h-5 w-5" />
                  Activate Assistant
                  <span className="absolute -inset-1 -z-10 animate-pulse rounded-full bg-gradient-to-r from-pink-500 to-purple-500 opacity-40 blur-lg transition-all group-hover:opacity-60" />
                </button>

                <button className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10">
                  Watch Her in Action
                </button>
              </div>
            </div>
          </div>

          {/* Background gradient */}
          <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
            <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
          </div>
        </div>

        {/* Voice Assistant Section - Right Side */}
        <div className="w-[400px] lg:w-[500px] border-l border-white/10 relative">
          {isVoiceAssistantActive ? (
            <div className="sticky top-0 h-screen p-4">
              <VoiceAssistant />
            </div>
          ) : (
            <div className="sticky top-0 h-screen flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                  <MicrophoneIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400">Click "Activate Assistant" to start</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
