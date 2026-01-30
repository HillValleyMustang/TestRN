/**
 * VideoPlayerModal Component
 * Fullscreen modal for playing YouTube videos
 */

import React, { useState } from 'react';
import { View, Modal, StyleSheet, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Colors, Spacing } from '../../constants/Theme';
import { extractYouTubeId } from '../../lib/youtube-helpers';

interface VideoPlayerModalProps {
  visible: boolean;
  videoUrl: string;
  onClose: () => void;
}

export function VideoPlayerModal({
  visible,
  videoUrl,
  onClose,
}: VideoPlayerModalProps) {
  const [playing, setPlaying] = useState(true);
  const videoId = extractYouTubeId(videoUrl);

  if (!videoId) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Close button */}
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="white" />
        </Pressable>

        {/* YouTube player */}
        <View style={styles.playerContainer}>
          <YoutubePlayer
            height={300}
            play={playing}
            videoId={videoId}
            onChangeState={(state) => {
              if (state === 'ended') {
                setPlaying(false);
              }
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerContainer: {
    width: '100%',
  },
});
