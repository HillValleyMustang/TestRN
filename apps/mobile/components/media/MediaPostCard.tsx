/**
 * MediaPostCard Component
 * Card displaying YouTube video thumbnail with title and creator
 */

import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MediaPost } from '@data/storage/models';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { getYouTubeThumbnailUrl } from '../../lib/youtube-helpers';

interface MediaPostCardProps {
  post: MediaPost;
  onPress: () => void;
}

export function MediaPostCard({ post, onPress }: MediaPostCardProps) {
  const thumbnailUrl = getYouTubeThumbnailUrl(post.video_url);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="videocam" size={32} color={Colors.mutedForeground} />
          </View>
        )}

        {/* Play button overlay */}
        <View style={styles.playButtonOverlay}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color="white" />
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
        {post.creator_name && (
          <Text style={styles.creator} numberOfLines={1}>
            {post.creator_name}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.muted,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.muted,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    marginTop: Spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
    lineHeight: 18,
  },
  creator: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
});
