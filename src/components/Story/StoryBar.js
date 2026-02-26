import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const StoryBar = ({ stories = [], onStoryPress, onAddStory, onRefresh }) => {
  const { user } = useAuth();

  // Debug: Log user and stories
  console.log('📊 [StoryBar] Rendering with:', {
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    storiesCount: stories?.length,
    hasUser: !!user,
  });

  // Helper function to safely get story index and handle edge cases
  const handleStoryPress = (userId, userName = 'User') => {
    if (!stories || stories.length === 0) {
      console.warn('⚠️ [StoryBar] No stories available');
      Alert.alert(
        'Story Tidak Tersedia',
        'Story belum tersedia. Coba refresh halaman.',
        [
          { text: 'Refresh', onPress: () => onRefresh?.() },
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }

    const storyIndex = stories.findIndex(s => Number(s.user_id) === Number(userId));
    console.log('📖 [StoryBar] Found story index:', storyIndex, 'for userId:', userId);

    if (storyIndex === -1) {
      console.warn('⚠️ [StoryBar] Story not found for user:', userId);
      Alert.alert(
        'Story Tidak Ditemukan',
        `Story dari ${userName} tidak ditemukan. Mungkin sudah kadaluarsa.`,
        [
          { text: 'Refresh', onPress: () => onRefresh?.() },
          { text: 'OK', style: 'cancel' }
        ]
      );
      return;
    }

    onStoryPress?.(storyIndex, Number(userId));
  };

  // Helper function to get time ago
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now - created;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays >= 1) {
      return `${diffDays} hari yang lalu`;
    } else if (diffHrs > 0) {
      return `${diffHrs} jam yang lalu`;
    } else if (diffMins > 0) {
      return `${diffMins} menit yang lalu`;
    } else {
      return 'Baru saja';
    }
  };

  // Stories are already grouped and ordered by backend
  // Just extract unique users while preserving order
  const seenUsers = new Set();
  const userStories = [];

  stories.forEach((story) => {
    if (!seenUsers.has(story.user_id)) {
      seenUsers.add(story.user_id);

      // Get all stories for this user (they should be consecutive in the array)
      const userStoriesList = stories.filter(s => s.user_id === story.user_id);
      const hasViewed = userStoriesList.every(s => s.has_viewed);

      userStories.push({
        userId: story.user_id,
        user: story.user,
        story: story,
        hasViewed,
        storyCount: userStoriesList.length
      });
    }
  });

  // Check if current user has stories
  // Convert userId to number for comparison since Object.entries returns string keys
  const userHasStories = user && userStories.some(us => Number(us.userId) === user?.id);
  const userStoryGroup = userStories.find(us => Number(us.userId) === user?.id);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Your Story - Always show first */}
        <TouchableOpacity
          style={styles.storyItem}
          onPress={() => {
            console.log('📖 [StoryBar] Your Story tapped', {
              userHasStories,
              userId: user?.id,
              totalStories: stories.length,
            });

            if (userHasStories && onStoryPress) {
              // Use safe handler with validation
              handleStoryPress(user.id, 'Anda');
            } else {
              // Add new story
              console.log('📖 [StoryBar] Opening story camera');
              onAddStory?.();
            }
          }}
        >
          <View style={[
            styles.storySquare,
            userHasStories && !userStoryGroup?.hasViewed && styles.unviewedBorder,
            userHasStories && userStoryGroup?.hasViewed && styles.viewedBorder,
          ]}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.storyImage}
              />
            ) : (
              <View style={[styles.storyImage, styles.defaultAvatar]}>
                <Text style={styles.defaultAvatarText}>
                  {user?.name?.[0]?.toUpperCase() || 'Y'}
                </Text>
              </View>
            )}
            {/* Add badge - always show so user can add more stories */}
            <View style={styles.addBadge}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.username} numberOfLines={1}>
            {userHasStories ? 'Your Story' : 'Add Story'}
          </Text>
          {userHasStories && userStoryGroup?.story?.created_at && (
            <Text style={styles.timestamp}>
              {getTimeAgo(userStoryGroup.story.created_at)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Add More Story button - visible when user already has stories */}
        {userHasStories && (
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => {
              console.log('📖 [StoryBar] Add more story tapped');
              onAddStory?.();
            }}
          >
            <View style={[styles.storySquare, styles.addMoreStorySquare]}>
              <Ionicons name="add-circle" size={36} color="#06402B" />
            </View>
            <Text style={styles.username} numberOfLines={1}>
              Tambah Story
            </Text>
          </TouchableOpacity>
        )}

        {/* Other users' stories */}
        {userStories
          .filter(us => Number(us.userId) !== user?.id)
          .map((userStory, index) => (
            <TouchableOpacity
              key={userStory.userId}
              style={styles.storyItem}
              onPress={() => {
                console.log('📖 [StoryBar] Other user story tapped', {
                  userId: userStory.userId,
                  userName: userStory.user?.name,
                });
                // Use safe handler with validation
                handleStoryPress(userStory.userId, userStory.user?.name || 'User');
              }}
            >
              <View style={[
                styles.storySquare,
                !userStory.hasViewed ? styles.unviewedBorder : styles.viewedBorder,
              ]}>
                {userStory.story?.thumbnail_url || userStory.user?.avatar_url ? (
                  <Image
                    source={{ uri: userStory.story?.thumbnail_url || userStory.user.avatar_url }}
                    style={styles.storyImage}
                  />
                ) : (
                  <View style={[styles.storyImage, styles.defaultAvatar]}>
                    <Text style={styles.defaultAvatarText}>
                      {userStory.user?.name?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.username} numberOfLines={1}>
                {userStory.user?.name || 'User'}
              </Text>
              <Text style={styles.timestamp}>
                {getTimeAgo(userStory.story.created_at)}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 90,
    marginRight: 12,
  },
  storySquare: {
    width: 80,
    height: 80,
    borderRadius: 12, // Rounded square, not circle
    marginBottom: 6,
    overflow: 'hidden',
  },
  unviewedBorder: {
    borderWidth: 3,
    borderColor: '#10B981', // Green border for unviewed
  },
  viewedBorder: {
    borderWidth: 2,
    borderColor: '#9CA3AF', // Gray border for viewed
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addMoreStorySquare: {
    backgroundColor: '#F0F9F4',
    borderWidth: 2,
    borderColor: '#06402B',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default StoryBar;
