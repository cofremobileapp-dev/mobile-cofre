import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import VideoItem from '../components/VideoItem';
import { useAuth } from '../contexts/AuthContext';

const VideoFeedScreen = ({ navigation, route }) => {
  const { videos: initialVideos, initialIndex = 0, title = 'Video' } = route.params;
  const { user } = useAuth();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const [videos, setVideos] = useState(initialVideos || []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const flatListRef = useRef(null);

  // Auto-pause videos when navigating away
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Scroll to initial index on mount
  useEffect(() => {
    if (initialIndex > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, []);

  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const getItemLayout = (data, index) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  });

  const renderVideoItem = ({ item, index }) => (
    <VideoItem
      item={item}
      isActive={index === currentIndex && isScreenFocused}
      isScreenFocused={isScreenFocused}
      currentUserId={user?.id}
      currentUser={user}
      navigation={navigation}
      currentIndex={index}
      totalVideos={videos.length}
    />
  );

  if (!videos || videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-off-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyText}>Tidak ada video</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Back Button */}
      <TouchableOpacity
        style={styles.headerBackButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Title Badge */}
      <View style={styles.titleBadge}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.countText}>{currentIndex + 1} / {videos.length}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failed
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 100);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06402B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerBackButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    padding: 8,
  },
  titleBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
  },
});

export default VideoFeedScreen;
