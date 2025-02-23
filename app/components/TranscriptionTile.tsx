'use client';

import { useEffect, useState } from 'react';
import { TranscriptionSegment, RoomEvent } from 'livekit-client';
import { useMaybeRoomContext } from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';

type TranscriptionsMap = { [id: string]: TranscriptionSegment };

export default function TranscriptionTile() {
  const room = useMaybeRoomContext();
  const [transcriptions, setTranscriptions] = useState<TranscriptionsMap>({});

  useEffect(() => {
    if (!room) return;
    const handleTranscription = (segments: TranscriptionSegment[]) => {
      setTranscriptions(prev => {
        const updated = { ...prev };
        segments.forEach(segment => {
          updated[segment.id] = segment;
        });
        return updated;
      });
    };

    room.on(RoomEvent.TranscriptionReceived, handleTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, handleTranscription);
    };
  }, [room]);

  const sortedTranscriptions = Object.values(transcriptions).sort(
    (a, b) => a.firstReceivedTime - b.firstReceivedTime
  );

  return (
    <div className="w-full bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-400">Live Transcription</h2>
        <span className="text-xs text-gray-500">{sortedTranscriptions.length} messages</span>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-track-black/20 scrollbar-thumb-white/10">
        <AnimatePresence>
          {sortedTranscriptions.map(segment => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-white/90 text-sm bg-white/5 rounded-lg p-3"
            >
              {segment.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {sortedTranscriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-gray-500 text-sm">No transcription yet...</p>
            <p className="text-gray-600 text-xs mt-1">Start speaking to see your words appear here</p>
          </div>
        )}
      </div>
    </div>
  );
} 