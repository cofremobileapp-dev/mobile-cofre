import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { apiService } from '../services/ApiService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HighlightViewerScreen = ({ route, navigation }) => {
  const { highlight } = route.params;
  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const progressInterval = useRef(null);

  useEffect(() => {
    loadHighlightStories();
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stories.length > 0) {
      startProgressTimer();
    }
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, stories]);

  const loadHighlightStories = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getHighlightDetails(highlight.id);
      const highlightData = response.data?.data || response.data;
      const storiesData = highlightData?.stories || highlightData?.items || [];
      setStories(storiesData);
    } catch (error) {
      console.error('Error loading highlight stories:', error);
      setStories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const startProgressTimer = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    setProgress(0);

    const currentStory = stories[currentIndex];
    const duration = currentStory?.media_type === 'video' ? 15000 : 5000;
    const interval = 50;
    let elapsed = 0;

    progressInterval.current = setInterval(() => {
      elapsed += interval;
      setProgress(elapsed / duration);

      if (elapsed >= duration) {
        clearInterval(progressInterval.current);
        goToNext();
      }
    }, interval);
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleTap = (event) => {
    const x = event.nativeEvent.locationX;
    if (x < SCREEN_WIDTH / 3) {
      goToPrevious();
    } else if (x > (SCREEN_WIDTH * 2) / 3) {
      goToNext();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.emptyContent}>
          <Ionicons name="images-outline" size={64} color="#FFFFFF" />
          <Text style={styles.emptyText}>Highlight kosong</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Story Content */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.mediaContainer}
        onPress={handleTap}
      >
        {currentStory.media_type === 'video' ? (
          <Video
            ref={videoRef}
            source={{ uri: currentStory.media_url }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay
            isLooping={false}
            isMuted={false}
          />
        ) : (
          <Image
            source={{ uri: currentStory.media_url || currentStory.thumbnail_url }}
            style={styles.media}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>

      {/* Progress Bars */}
      <SafeAreaView style={styles.progressContainer} edges={['top']}>
        <View style={styles.progressBars}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: index < currentIndex
                      ? '100%'
                      : index === currentIndex
                        ? `${progress * 100}%`
                        : '0%'
                  }
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.highlightIcon}>
              <Ionicons name="star" size={20} color="#06402B" />
            </View>
            <Text style={styles.highlightName}>{highlight.name}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Caption */}
      {currentStory.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{currentStory.caption}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressBars: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 4,
  },
  progressBarContainer: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 12,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default HighlightViewerScreen;
