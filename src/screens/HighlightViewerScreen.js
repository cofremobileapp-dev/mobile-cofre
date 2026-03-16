import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StoryViewer from '../components/Story/StoryViewer';
import { apiService } from '../services/ApiService';

const HighlightViewerScreen = ({ route, navigation }) => {
  const { highlight } = route.params;
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHighlightStories();
  }, []);

  const extractStories = (data) => {
    if (!data) return [];
    if (data?.highlight?.stories && Array.isArray(data.highlight.stories)) return data.highlight.stories;
    if (data?.data?.highlight?.stories && Array.isArray(data.data.highlight.stories)) return data.data.highlight.stories;
    if (data?.data?.stories && Array.isArray(data.data.stories)) return data.data.stories;
    if (data?.stories && Array.isArray(data.stories)) return data.stories;
    if (data?.data?.items && Array.isArray(data.data.items)) return data.data.items;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  };

  const loadHighlightStories = async () => {
    try {
      setIsLoading(true);

      const endpoints = [
        `/highlights/${highlight.id}`,
        `/highlights/${highlight.id}/stories`,
      ];

      let storiesData = [];

      for (const endpoint of endpoints) {
        try {
          const response = await apiService.get(endpoint);
          const parsed = extractStories(response.data);
          if (parsed.length > 0) {
            storiesData = parsed;
            break;
          }
        } catch (err) {
          continue;
        }
      }

      // Fallback: use stories from the highlight object passed via navigation
      if (storiesData.length === 0 && highlight.stories && Array.isArray(highlight.stories)) {
        storiesData = highlight.stories;
      }

      setStories(storiesData);
    } catch (error) {
      console.error('Error loading highlight stories:', error);
      if (highlight.stories && Array.isArray(highlight.stories)) {
        setStories(highlight.stories);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // Show empty state instead of blank white screen when no stories
  if (!stories || stories.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="images-outline" size={64} color="#6B7280" />
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
          Highlight Kosong
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          Belum ada story di highlight "{highlight.title || highlight.name}"
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: '#06402B', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <StoryViewer
      visible={true}
      stories={stories}
      initialIndex={0}
      onClose={() => navigation.goBack()}
      onStoryChange={() => {}}
    />
  );
};

export default HighlightViewerScreen;
