import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
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
