'use client';

import { useState } from 'react';
import { useAuth } from '@/app/hooks/useAuth';
import { createPresentation, PresentationRequest } from '@/utils/presentations';

export default function CreatePresentation() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('My Creative Presentation');

  const handleCreatePresentation = async () => {
    if (!session?.user?.id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: PresentationRequest = {
        title,
        slides: [
          {
            layout: "TITLE",
            title: title,
            content: "Created with Next.js and Google Slides API",
            style: {
              textStyle: {
                fontSize: {
                  magnitude: 40,
                  unit: "PT"
                },
                foregroundColor: {
                  opaqueColor: {
                    rgbColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.4
                    }
                  }
                },
                bold: true
              }
            },
            background_color: {
              red: 0.95,
              green: 0.95,
              blue: 1.0
            }
          },
          {
            layout: "TITLE_AND_BODY",
            title: "Welcome to Our Demo",
            content: "• Automated Presentation Creation\n• Custom Styling\n• Dynamic Content\n• Real-time Updates",
            style: {
              textStyle: {
                fontSize: {
                  magnitude: 28,
                  unit: "PT"
                },
                foregroundColor: {
                  opaqueColor: {
                    rgbColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.2
                    }
                  }
                }
              }
            }
          }
        ]
      };

      const response = await createPresentation(session.user.id, request);
      
      // Open the presentation in a new tab
      window.open(response.url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create presentation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Create Presentation</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Presentation Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleCreatePresentation}
          disabled={loading || !session}
          className={`w-full flex justify-center py-3 px-4 rounded-md text-white font-semibold transition-colors ${
            loading || !session
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            'Create Presentation'
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {!session && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
          Please sign in to create presentations
        </div>
      )}
    </div>
  );
} 