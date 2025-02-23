'use client';

import { ControlBar, LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useConnectionState } from '@livekit/components-react';
import '@livekit/components-styles';
import { useEffect, useState, useCallback } from 'react';
import { LocalParticipant, LocalTrackPublication, ConnectionState } from 'livekit-client';
import TranscriptionTile from './components/TranscriptionTile';
import SpeechAnimation from './components/SpeechAnimation';
import { MicrophoneIcon as MicOn, NoSymbolIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid';

// Add TypeScript declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

function VoiceAssistantUI({ onDisconnect }: { onDisconnect: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMicrophone = async () => {
      if (localParticipant && connectionState === ConnectionState.Connected && !isInitialized) {
        try {
          await localParticipant.setMicrophoneEnabled(true);
          setIsMicrophoneEnabled(true);
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize microphone:', error);
        }
      }
    };

    initializeMicrophone();
  }, [localParticipant, connectionState, isInitialized]);

  const toggleMicrophone = useCallback(async () => {
    if (localParticipant && connectionState === ConnectionState.Connected) {
      try {
        const enabled = !isMicrophoneEnabled;
        await localParticipant.setMicrophoneEnabled(enabled);
        setIsMicrophoneEnabled(enabled);
      } catch (error) {
        console.error('Failed to toggle microphone:', error);
      }
    }
  }, [localParticipant, isMicrophoneEnabled, connectionState]);

  const isConnecting = connectionState === ConnectionState.Connecting;
  const isConnected = connectionState === ConnectionState.Connected;

  return (
    <div className="flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-grow">
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
              Voice Assistant
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              {isConnecting ? 'Connecting...' : 'Speak naturally and see your words come to life'}
            </p>
          </div>
          {isConnected && (
            <button
              onClick={onDisconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 hover:text-white"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          <SpeechAnimation isActive={isMicrophoneEnabled && isConnected} />
          
          <button
            onClick={toggleMicrophone}
            disabled={!isConnected}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
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

export default function VoiceAssistantPage() {
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const room = 'assistant-room';
  const username = 'assistant-user';

  const connectToRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/token?room=${room}&username=${username}`);
      const data = await res.json();
      setToken(data.token);
      setIsConnected(true);
    } catch (e) {
      console.error('Failed to connect:', e);
    }
  }, []);

  const disconnectFromRoom = useCallback(() => {
    setToken('');
    setIsConnected(false);
  }, []);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="text-center space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400">
              Voice Assistant
            </h1>
            <p className="text-gray-400 text-sm md:text-base">Connect to start your voice session</p>
            <button
              onClick={connectToRoom}
              className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full font-medium transition-all ring-2 ring-purple-400/50 ring-opacity-50 hover:ring-opacity-75 shadow-lg mt-4"
            >
              <MicOn className="w-5 h-5" />
              <span>Connect to Voice Room</span>
            </button>
          </div>
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
      onDisconnected={disconnectFromRoom}
    >
      <VoiceAssistantUI onDisconnect={disconnectFromRoom} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
} 