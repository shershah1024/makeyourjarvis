'use client';

import { useState, useCallback, useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useConnectionState } from '@livekit/components-react';
import '@livekit/components-styles';
import { ConnectionState } from 'livekit-client';
import { MicrophoneIcon as MicOn, NoSymbolIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import TranscriptionTile from './TranscriptionTile';
import SpeechAnimation from './SpeechAnimation';

function ConnectionStatus({ state }: { state: ConnectionState }) {
  const getStatusColor = () => {
    switch (state) {
      case ConnectionState.Connected:
        return 'bg-green-500';
      case ConnectionState.Connecting:
        return 'bg-yellow-500 animate-pulse';
      case ConnectionState.Disconnected:
        return 'bg-gray-500';
      case ConnectionState.Reconnecting:
        return 'bg-orange-500 animate-pulse';
      default:
        return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case ConnectionState.Connected:
        return 'Connected';
      case ConnectionState.Connecting:
        return 'Connecting...';
      case ConnectionState.Disconnected:
        return 'Disconnected';
      case ConnectionState.Reconnecting:
        return 'Reconnecting...';
      default:
        return 'Connection Failed';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
      <span className="text-xs text-gray-400">{getStatusText()}</span>
    </div>
  );
}

function VoiceAssistantUI() {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);

  const initializeMicrophone = useCallback(async () => {
    if (localParticipant && connectionState === ConnectionState.Connected && !isInitialized) {
      try {
        await localParticipant.setMicrophoneEnabled(true);
        setIsMicrophoneEnabled(true);
        setIsInitialized(true);
        setMicrophoneError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize microphone';
        setMicrophoneError(errorMessage);
        console.error('Failed to initialize microphone:', error);
      }
    }
  }, [localParticipant, connectionState, isInitialized]);

  const toggleMicrophone = useCallback(async () => {
    if (localParticipant && connectionState === ConnectionState.Connected) {
      try {
        const enabled = !isMicrophoneEnabled;
        await localParticipant.setMicrophoneEnabled(enabled);
        setIsMicrophoneEnabled(enabled);
        setMicrophoneError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to toggle microphone';
        setMicrophoneError(errorMessage);
        console.error('Failed to toggle microphone:', error);
      }
    }
  }, [localParticipant, isMicrophoneEnabled, connectionState]);

  // Auto-initialize microphone when connected
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && !isInitialized) {
      initializeMicrophone();
    }
  }, [connectionState, isInitialized, initializeMicrophone]);

  // Reset states on disconnection
  useEffect(() => {
    if (connectionState === ConnectionState.Disconnected) {
      setIsMicrophoneEnabled(false);
      setIsInitialized(false);
    }
  }, [connectionState]);

  const isConnecting = connectionState === ConnectionState.Connecting;
  const isConnected = connectionState === ConnectionState.Connected;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const hasError = connectionState === ConnectionState.Disconnected && !isConnecting && !isReconnecting;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
          Voice Assistant
        </h2>
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-400 text-sm">
            {isConnecting ? 'Connecting to Sassy...' : 
             isReconnecting ? 'Reconnecting...' :
             hasError ? 'Connection failed' :
             'Speak naturally and see your words come to life'}
          </p>
          <ConnectionStatus state={connectionState} />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-between">
        <div className="w-full flex-1 flex flex-col items-center">
          <SpeechAnimation isActive={isMicrophoneEnabled && isConnected} />
          
          {microphoneError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{microphoneError}</span>
            </div>
          )}
          
          <button
            onClick={toggleMicrophone}
            disabled={!isConnected}
            className={`mt-6 flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
              !isConnected
                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                : isMicrophoneEnabled 
                  ? 'bg-pink-500 hover:bg-pink-600 text-white ring-pink-400/50'
                  : 'bg-purple-500 hover:bg-purple-600 text-white ring-purple-400/50'
            } ring-2 ring-opacity-50 hover:ring-opacity-75 shadow-lg`}
          >
            {isMicrophoneEnabled ? (
              <>
                <NoSymbolIcon className="w-5 h-5" />
                <span>Mute Microphone</span>
              </>
            ) : (
              <>
                <MicOn className="w-5 h-5" />
                <span>Unmute Microphone</span>
              </>
            )}
          </button>
        </div>

        <TranscriptionTile />
      </div>
    </div>
  );
}

export default function VoiceAssistant() {
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = 'assistant-room';
  const username = 'assistant-user';

  const connectToRoom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/token?room=${room}&username=${username}`);
      if (!res.ok) {
        throw new Error('Failed to get access token');
      }
      const data = await res.json();
      setToken(data.token);
      setIsConnected(true);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to connect';
      setError(errorMessage);
      console.error('Failed to connect:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = () => {
    setError(null);
    connectToRoom();
  };

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
        <div className="text-center space-y-4 flex-1 flex flex-col items-center justify-center">
          <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
            Voice Assistant
          </h2>
          <p className="text-gray-400 text-sm">
            {isLoading ? 'Connecting to Sassy...' : 'Connect to start your voice session'}
          </p>
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={error ? handleRetry : connectToRoom}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full font-medium transition-all ring-2 ring-purple-400/50 ring-opacity-50 hover:ring-opacity-75 shadow-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : error ? (
              <>
                <ArrowPathIcon className="w-5 h-5" />
                <span>Retry Connection</span>
              </>
            ) : (
              <>
                <MicOn className="w-5 h-5" />
                <span>Connect to Sassy</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      audio={true}
      video={false}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      className="h-full"
    >
      <VoiceAssistantUI />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
} 