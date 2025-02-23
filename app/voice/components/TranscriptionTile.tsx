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
    <div className="mt-8 w-full bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
      <h2 className="text-sm font-medium text-gray-400 mb-3">Transcription</h2>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        <AnimatePresence>
          {sortedTranscriptions.map(segment => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-white/90 text-sm"
            >
              {segment.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {sortedTranscriptions.length === 0 && (
          <p className="text-gray-500 text-sm italic">No transcription yet...</p>
        )}
      </div>
    </div>
  );
} 