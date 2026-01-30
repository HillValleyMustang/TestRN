/**
 * MediaFeedScreen Component
 * Main screen for browsing and filtering media posts
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMediaPosts } from '../../hooks/data';
import { MediaPostCard } from './MediaPostCard';
import { TagFilterChips } from './TagFilterChips';
import { VideoPlayerModal } from './VideoPlayerModal';
import { Colors, Spacing } from '../../constants/Theme';
import type { MediaPost } from '@data/storage/models';

export function MediaFeedScreen() {
  const { data: posts, loading, error } = useMediaPosts();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<MediaPost | null>(null);

  // Extract unique tags from all posts
  const availableTags = useMemo(() => {
    if (!posts) return [];
    const tagSet = new Set<string>();
    posts.forEach(post => {
      post.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [posts]);

  // Filter posts by selected tags
  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (selectedTags.length === 0) return posts; // "All" selected

    return posts.filter(post =>
      selectedTags.some(tag => post.tags.includes(tag))
    );
  }, [posts, selectedTags]);

  const handleCardPress = (post: MediaPost) => {
    setSelectedVideo(post);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  // Render posts in a 2-column grid layout
  const renderGrid = () => {
    const rows: MediaPost[][] = [];
    for (let i = 0; i < filteredPosts.length; i += 2) {
      rows.push(filteredPosts.slice(i, i + 2));
    }

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {row.map((post) => (
          <View key={post.id} style={styles.cardWrapper}>
            <MediaPostCard post={post} onPress={() => handleCardPress(post)} />
          </View>
        ))}
        {/* Add empty placeholder if odd number of items in last row */}
        {row.length === 1 && <View style={styles.cardWrapper} />}
      </View>
    ));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.actionPrimary} />
        <Text style={styles.loadingText}>Loading media...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.destructive} />
        <Text style={styles.errorTitle}>Failed to Load Media</Text>
        <Text style={styles.errorSubtitle}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tag filters */}
      {availableTags.length > 0 && (
        <TagFilterChips
          availableTags={availableTags}
          selectedTags={selectedTags}
          onSelectionChange={setSelectedTags}
        />
      )}

      {/* Media grid */}
      {filteredPosts.length > 0 ? (
        <View style={styles.gridContainer}>
          {renderGrid()}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={selectedTags.length > 0 ? 'filter-outline' : 'videocam-outline'}
            size={48}
            color={Colors.mutedForeground}
          />
          <Text style={styles.emptyTitle}>
            {selectedTags.length > 0 ? 'No Matching Videos' : 'No Videos Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {selectedTags.length > 0
              ? 'Try selecting different tags'
              : 'Check back later for content'}
          </Text>
        </View>
      )}

      {/* Video player modal */}
      {selectedVideo && (
        <VideoPlayerModal
          visible={!!selectedVideo}
          videoUrl={selectedVideo.video_url}
          onClose={handleCloseVideo}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: Spacing.md,
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  gridContainer: {
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardWrapper: {
    width: '48%',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    fontFamily: 'Poppins_400Regular',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
