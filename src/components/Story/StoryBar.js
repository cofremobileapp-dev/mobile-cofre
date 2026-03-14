import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

const StoryBar = ({ stories = [], onStoryPress, onAddStory, transparent = false }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Helper function to get time ago
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now - created;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays >= 1) {
      return `${diffDays} ${t('daysAgo')}`;
    } else if (diffHrs > 0) {
      return `${diffHrs} ${t('hoursAgo')}`;
    } else if (diffMins > 0) {
      return `${diffMins} ${t('minutesAgo')}`;
    } else {
      return t('justNow');
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
      // For own stories: always show green ring (active indicator) since user doesn't "view" own stories
      // For other users: check if all their stories have been viewed
      const isOwnStory = user && Number(story.user_id) === user.id;
      const hasViewed = isOwnStory ? false : userStoriesList.every(s => s.has_viewed);

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
  const userHasStories = user && userStories.some(us => Number(us.userId) === user?.id);
  const userStoryGroup = userStories.find(us => Number(us.userId) === user?.id);

  // Render avatar with proper ring/border separation
  const renderAvatar = (avatarUri, fallbackName, hasRing, isViewed) => {
    const ringStyle = hasRing
      ? (isViewed
        ? [styles.storyRing, styles.viewedRing, { borderColor: colors.iconInactive }]
        : [styles.storyRing, styles.unviewedRing])
      : [styles.storyRing, styles.noRing];

    return (
      <View style={ringStyle}>
        <View style={styles.imageClip}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.storyImage}
            />
          ) : (
            <View style={[styles.storyImage, styles.defaultAvatar]}>
              <Text style={styles.defaultAvatarText}>
                {fallbackName?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: transparent ? 'transparent' : colors.background, borderBottomColor: transparent ? 'transparent' : colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        {/* Your Story - Always show first */}
        <View style={styles.storyItem}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (userHasStories && onStoryPress) {
                const storyIndex = stories.findIndex(s => Number(s.user_id) === user?.id);
                onStoryPress(storyIndex, user.id);
              } else {
                if (onAddStory) onAddStory();
              }
            }}
          >
            {renderAvatar(
              user?.avatar_url,
              user?.name || 'Y',
              userHasStories,
              userStoryGroup?.hasViewed,
            )}
          </TouchableOpacity>
          {/* Add badge - separate touchable to always open camera */}
          <TouchableOpacity
            style={[styles.addBadge, { borderColor: colors.background }]}
            activeOpacity={0.7}
            onPress={() => {
              if (onAddStory) onAddStory();
            }}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.username, { color: colors.textPrimary }]} numberOfLines={1}>
            {userHasStories ? t('yourStory') : t('addStory')}
          </Text>
          {userHasStories && userStoryGroup?.story?.created_at && (
            <Text style={[styles.timestamp, { color: colors.iconInactive }]}>
              {getTimeAgo(userStoryGroup.story.created_at)}
            </Text>
          )}
        </View>

        {/* Other users' stories */}
        {userStories
          .filter(us => Number(us.userId) !== user?.id)
          .map((userStory) => (
            <TouchableOpacity
              key={userStory.userId}
              style={styles.storyItem}
              onPress={() => {
                const storyIndex = stories.findIndex(s => Number(s.user_id) === Number(userStory.userId));
                onStoryPress?.(storyIndex, Number(userStory.userId));
              }}
            >
              {renderAvatar(
                userStory.story?.thumbnail_url || userStory.user?.avatar_url,
                userStory.user?.name || 'U',
                true,
                userStory.hasViewed,
              )}
              <Text style={[styles.username, { color: colors.textPrimary }]} numberOfLines={1}>
                {userStory.user?.name || 'User'}
              </Text>
              {userStory.story?.created_at && (
                <Text style={[styles.timestamp, { color: colors.iconInactive }]}>
                  {getTimeAgo(userStory.story.created_at)}
                </Text>
              )}
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
    width: 80,
    marginRight: 8,
    position: 'relative',
  },
  // Outer ring - border is visible here (NO overflow hidden)
  storyRing: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginBottom: 6,
    padding: 2,
  },
  unviewedRing: {
    borderWidth: 3,
    borderColor: '#10B981', // Green border for unviewed
  },
  viewedRing: {
    borderWidth: 2,
    borderColor: '#9CA3AF', // Gray border for viewed
  },
  noRing: {
    borderWidth: 0,
  },
  // Inner clip container - overflow hidden here to clip image
  imageClip: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
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
  addBadge: {
    position: 'absolute',
    top: 52,
    right: 2,
    backgroundColor: '#10B981',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
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
