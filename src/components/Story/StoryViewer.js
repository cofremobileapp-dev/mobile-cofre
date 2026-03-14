import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
  Animated,
  PanResponder,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import useStories from '../../hooks/useStories';
import { apiService } from '../../services/ApiService';

const StoryViewer = ({
  visible,
  stories = [],
  initialIndex = 0,
  onClose,
  onStoryChange,
  onNavigateToArchive,
}) => {
  // FIRST LOG - Check if component is being called
  console.log('🚀 [StoryViewer] Component function called', {
    visible,
    storiesCount: stories?.length,
    initialIndex,
  });

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const { user } = useAuth();
  const { markAsViewed, deleteStory, archiveStory, unarchiveStory, getViewers } = useStories();

  // Clamp initialIndex to valid range to prevent null currentStory
  const safeInitialIndex = Math.max(0, Math.min(initialIndex, (stories?.length || 1) - 1));
  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Interactive sticker states
  const [pollVotes, setPollVotes] = useState({}); // { stickerIdx: selectedOptionIdx }
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(null);
  const [activeQuestionText, setActiveQuestionText] = useState('');
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [questionSent, setQuestionSent] = useState({}); // { stickerIdx: true }

  // Immediately sync currentIndex when viewer opens (setState during render pattern)
  // This prevents stale index from previous session causing null currentStory
  const [prevVisible, setPrevVisible] = useState(false);
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
  if (visible && (!prevVisible || initialIndex !== prevInitialIndex)) {
    setCurrentIndex(safeInitialIndex);
    setPrevVisible(true);
    setPrevInitialIndex(initialIndex);
    setIsPaused(false);
    setPollVotes({});
    setQuestionSent({});
  }
  if (!visible && prevVisible) {
    setPrevVisible(false);
  }

  const videoRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const currentIndexRef = useRef(currentIndex);
  const storiesRef = useRef(stories);

  // Keep refs in sync with state/props
  currentIndexRef.current = currentIndex;
  storiesRef.current = stories;

  // Use fallback chain to always get a valid story when stories exist
  const currentStory = stories[currentIndex] || stories[safeInitialIndex] || stories[0];
  const isOwner = Number(user?.id) === Number(currentStory?.user_id);

  const styles = useMemo(() => createStyles(SCREEN_WIDTH, SCREEN_HEIGHT), [SCREEN_WIDTH, SCREEN_HEIGHT]);

  // Debug logging
  useEffect(() => {
    console.log('📖 [StoryViewer] Current state:', {
      visible,
      currentIndex,
      totalStories: stories?.length || 0,
      currentStory: currentStory ? {
        id: currentStory.id,
        media_url: currentStory.media_url,
        media_type: currentStory.media_type,
        user_id: currentStory.user_id,
        user_name: currentStory.user?.name,
      } : null,
      isOwner,
      isPaused,
      isLoading,
    });
  }, [visible, currentIndex, currentStory, isOwner, isPaused, isLoading]);

  // Initialize progress animation
  useEffect(() => {
    if (!visible || !currentStory || isPaused) return;

    const duration = (currentStory.duration || 5) * 1000; // Convert to milliseconds, default 5s

    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [currentIndex, visible, isPaused, currentStory]);

  // Close handler that passes viewed story IDs back to parent
  const handleClose = () => {
    if (onClose) {
      onClose(Array.from(viewedStoriesRef.current));
    }
  };

  // Mark as viewed - record view for non-owners, update local state for all
  const viewedStoriesRef = useRef(new Set());
  useEffect(() => {
    if (visible && currentStory && !viewedStoriesRef.current.has(currentStory.id)) {
      viewedStoriesRef.current.add(currentStory.id);
      if (!isOwner) {
        // Send view to backend for non-owners
        markAsViewed(currentStory.id);
      }
    }
  }, [currentIndex, visible, currentStory, isOwner]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!visible) {
      progressAnim.setValue(0);
      if (videoRef.current) {
        videoRef.current.stopAsync();
      }
    }
  }, [visible]);

  // For creators: auto-fetch sticker responses when viewing own story with stickers
  useEffect(() => {
    if (visible && currentStory && isOwner && currentStory.stickers) {
      // Fetch interaction data in background so creator sees results on stickers
      fetchViewersAndReplies(currentStory.id)
        .then(({ viewersList, responses }) => {
          setViewers(viewersList);
          setStickerResponses(responses);
          console.log('📊 [StoryViewer] Auto-loaded responses for owner:', responses.length);
        })
        .catch(() => {});
    }
  }, [currentIndex, visible, isOwner]);

  // Reset interactive sticker states when story changes
  useEffect(() => {
    setPollVotes({});
    setQuestionSent({});
    setShowQuestionModal(false);
  }, [currentIndex]);

  const handleNext = () => {
    const idx = currentIndexRef.current;
    const strs = storiesRef.current;
    if (idx < strs.length - 1) {
      const nextStory = strs[idx + 1];
      const curr = strs[idx];

      if (Number(nextStory.user_id) !== Number(curr.user_id)) {
        progressAnim.setValue(0);
      }

      setCurrentIndex(idx + 1);
      progressAnim.setValue(0);
      onStoryChange?.(idx + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    const idx = currentIndexRef.current;
    const strs = storiesRef.current;
    if (idx > 0) {
      const prevStory = strs[idx - 1];
      const curr = strs[idx];

      if (Number(prevStory.user_id) !== Number(curr.user_id)) {
        progressAnim.setValue(0);
      }

      setCurrentIndex(idx - 1);
      progressAnim.setValue(0);
      onStoryChange?.(idx - 1);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (currentStory?.media_type === 'video' && videoRef.current) {
      if (isPaused) {
        videoRef.current.playAsync();
      } else {
        videoRef.current.pauseAsync();
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStory(currentStory.id);
              const strs = storiesRef.current;
              const idx = currentIndexRef.current;
              if (strs.length > 1) {
                if (idx > 0) {
                  setCurrentIndex(idx - 1);
                } else {
                  handleNext();
                }
              } else {
                handleClose();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete story');
            }
          },
        },
      ]
    );
  };

  const handleArchive = async () => {
    try {
      await archiveStory(currentStory.id);
      Alert.alert(
        'Berhasil',
        'Story berhasil diarsipkan.',
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Lihat Arsip',
            onPress: () => {
              handleClose();
              if (onNavigateToArchive) {
                onNavigateToArchive();
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Gagal mengarsipkan story');
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchiveStory(currentStory.id);
      Alert.alert('Berhasil', 'Story berhasil dikembalikan dari arsip');
    } catch (err) {
      Alert.alert('Error', 'Gagal mengembalikan story dari arsip');
    }
  };

  // Format time relative to now (e.g., "2 menit yang lalu")
  const formatTimeAgo = (date) => {
    const now = new Date();
    const viewedDate = new Date(date);
    const seconds = Math.floor((now - viewedDate) / 1000);

    if (seconds < 60) return 'Baru saja';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari yang lalu`;

    return viewedDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const [stickerResponses, setStickerResponses] = useState([]);

  // Parse interaction data from various response formats
  const parseInteractions = (responseData) => {
    const parsed = [];
    if (!responseData) return parsed;

    // Try to get interactions from various response shapes (including deep nesting)
    let items = responseData.interactions
      || responseData.replies
      || responseData.responds
      || responseData.responses
      || responseData.data?.interactions
      || responseData.data?.replies
      || responseData.data?.responds
      || responseData.data?.responses
      || responseData.data?.data
      || responseData.data
      || [];

    // If items is not an array (e.g., a paginated object), try to extract
    if (!Array.isArray(items)) {
      if (items?.data && Array.isArray(items.data)) {
        items = items.data;
      } else {
        items = [];
      }
    }

    items.forEach((item) => {
      if (!item || typeof item !== 'object') return;

      // Case 1: Direct interaction object (from /interact or /respond endpoint)
      if (item.type === 'poll_vote' || item.type === 'question_answer') {
        parsed.push({
          ...item,
          user: item.user || item.sender || item.viewer,
          created_at: item.created_at,
        });
        return;
      }

      // Case 2: Structured JSON inside message field (from /reply endpoint)
      const msg = item.message || item.content || item.text || item.body || '';
      if (typeof msg === 'string' && msg.trim().startsWith('{')) {
        try {
          const data = JSON.parse(msg);
          if (data.type === 'poll_vote' || data.type === 'question_answer') {
            parsed.push({
              ...data,
              user: item.user || item.sender || item.viewer || item.from,
              created_at: item.created_at,
            });
          }
        } catch {
          // Not valid JSON, skip
        }
      }

      // Case 3: Interaction data in a nested field
      if (item.interaction) {
        const interaction = typeof item.interaction === 'string'
          ? (() => { try { return JSON.parse(item.interaction); } catch { return null; } })()
          : item.interaction;
        if (interaction && (interaction.type === 'poll_vote' || interaction.type === 'question_answer')) {
          parsed.push({
            ...interaction,
            user: item.user || item.sender || item.viewer,
            created_at: item.created_at,
          });
        }
      }
    });

    return parsed;
  };

  // Extract interaction data from viewers list (some backends embed it in viewer records)
  const extractViewerInteractions = (viewersList) => {
    const parsed = [];
    if (!Array.isArray(viewersList)) return parsed;

    viewersList.forEach((view) => {
      const viewer = view.viewer || view.user || view;

      // Check if viewer record has interaction data (array)
      const interactions = view.interactions || view.responses || view.replies || [];
      if (Array.isArray(interactions)) {
        interactions.forEach((interaction) => {
          parsed.push({
            ...interaction,
            user: viewer,
            created_at: interaction.created_at || view.viewed_at,
          });
        });
      }

      // Check for single interaction field
      if (view.interaction_type && (view.interaction_type === 'poll_vote' || view.interaction_type === 'question_answer')) {
        let interactionData = view.interaction_data || {};
        if (typeof interactionData === 'string') {
          try { interactionData = JSON.parse(interactionData); } catch { interactionData = {}; }
        }
        parsed.push({
          type: view.interaction_type,
          ...interactionData,
          user: viewer,
          created_at: view.viewed_at,
        });
      }

      // Check for reply/message field that might contain JSON interaction data
      const replyMsg = view.reply?.message || view.reply_message || view.message || view.reply;
      if (typeof replyMsg === 'string' && replyMsg.trim().startsWith('{')) {
        try {
          const data = JSON.parse(replyMsg);
          if (data.type === 'poll_vote' || data.type === 'question_answer') {
            parsed.push({
              ...data,
              user: viewer,
              created_at: view.reply?.created_at || view.viewed_at,
            });
          }
        } catch { /* not valid JSON */ }
      }
    });

    return parsed;
  };

  // Extract interactions from the full viewers API response (replies, interactions may be siblings of viewers)
  const extractFromFullResponse = (fullResponse) => {
    if (!fullResponse || typeof fullResponse !== 'object') return [];

    const parsed = [];

    // Check for replies/interactions arrays at the top level or nested
    const sources = [
      fullResponse.replies,
      fullResponse.interactions,
      fullResponse.responses,
      fullResponse.data?.replies,
      fullResponse.data?.interactions,
      fullResponse.data?.responses,
    ];

    for (const source of sources) {
      if (Array.isArray(source) && source.length > 0) {
        const items = parseInteractions({ data: source });
        parsed.push(...items);
      }
    }

    return parsed;
  };

  const fetchViewersAndReplies = async (storyId) => {
    // Fetch from 3 sources in parallel
    let viewersResult, interactionsRes, storyDetailRes;
    try {
      [viewersResult, interactionsRes, storyDetailRes] = await Promise.all([
        getViewers(storyId),
        apiService.getStoryInteractions(storyId),
        apiService.get(`/stories/${storyId}`).catch(() => ({ data: {} })),
      ]);
    } catch {
      viewersResult = { viewers: [], fullResponse: {} };
      interactionsRes = { data: {} };
      storyDetailRes = { data: {} };
    }

    // getViewers returns { viewers: [...], fullResponse: {...} }
    const viewersList = viewersResult?.viewers || viewersResult || [];
    const viewersFullResponse = viewersResult?.fullResponse || {};

    console.log('📊 [StoryViewer] Viewers full response keys:', Object.keys(viewersFullResponse));
    console.log('📊 [StoryViewer] Story detail keys:', Object.keys(storyDetailRes?.data || {}));

    // Source 1: Parse interactions from the dedicated interactions/replies endpoint
    const interactionResponses = parseInteractions(interactionsRes?.data);
    console.log('📊 [StoryViewer] From interactions endpoint:', interactionResponses.length);

    // Source 2: Extract any interaction data embedded in individual viewer records
    const viewerInteractions = extractViewerInteractions(Array.isArray(viewersList) ? viewersList : []);
    console.log('📊 [StoryViewer] From viewer records:', viewerInteractions.length);

    // Source 3: Extract interactions from the full viewers API response (siblings of viewers array)
    const responseInteractions = extractFromFullResponse(viewersFullResponse);
    console.log('📊 [StoryViewer] From full viewers response:', responseInteractions.length);

    // Source 4: Extract from story detail (replies relationship)
    const storyData = storyDetailRes?.data;
    const storyDetailInteractions = [];
    if (storyData) {
      // The story detail may have replies at various nesting levels
      const storyObj = storyData.story || storyData.data || storyData;
      const replySources = [
        storyObj?.replies,
        storyObj?.interactions,
        storyObj?.responses,
        storyObj?.story_replies,
        storyData?.replies,
        storyData?.interactions,
        storyData?.responses,
      ];
      for (const src of replySources) {
        if (Array.isArray(src) && src.length > 0) {
          console.log('📊 [StoryViewer] Found replies in story detail:', src.length);
          const parsed = parseInteractions({ data: src });
          storyDetailInteractions.push(...parsed);
        }
      }
    }
    console.log('📊 [StoryViewer] From story detail:', storyDetailInteractions.length);

    // Merge all sources and deduplicate
    const allResponses = [...interactionResponses, ...viewerInteractions, ...responseInteractions, ...storyDetailInteractions];
    const uniqueResponses = allResponses.filter((resp, idx, self) => {
      return idx === self.findIndex(r =>
        r.user?.id === resp.user?.id &&
        r.type === resp.type &&
        r.sticker_index === resp.sticker_index
      );
    });

    console.log('📊 [StoryViewer] Total unique responses:', uniqueResponses.length);

    return { viewersList: Array.isArray(viewersList) ? viewersList : [], responses: uniqueResponses };
  };

  const handleShowViewers = async () => {
    if (!isOwner) return;

    setLoadingViewers(true);
    setShowViewersModal(true);

    try {
      const { viewersList, responses } = await fetchViewersAndReplies(currentStory.id);
      setViewers(viewersList);
      setStickerResponses(responses);
    } catch (err) {
      console.error('Error fetching viewers:', err);
      Alert.alert('Error', 'Failed to load viewers');
      setShowViewersModal(false);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Auto-refresh viewers data every 5 seconds when modal is open
  useEffect(() => {
    let refreshInterval;

    if (showViewersModal && isOwner && currentStory) {
      refreshInterval = setInterval(async () => {
        try {
          const { viewersList, responses } = await fetchViewersAndReplies(currentStory.id);
          setViewers(viewersList);
          setStickerResponses(responses);
        } catch (err) {
          console.error('Error refreshing viewers:', err);
        }
      }, 5000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [showViewersModal, isOwner, currentStory, getViewers]);

  const submitReport = async () => {
    if (!reportReason) {
      Alert.alert('Error', 'Pilih alasan terlebih dahulu');
      return;
    }

    try {
      await apiService.reportStory(currentStory.id, {
        reason: reportReason,
        details: reportDetails
      });

      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');

      Alert.alert('Berhasil', 'Story berhasil dilaporkan');
    } catch (error) {
      console.error('Failed to report story:', error);
      Alert.alert('Error', 'Gagal melaporkan story');
    }
  };

  // Pan responder for gestures (long-press to pause, swipe to navigate)
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Don't capture touch events in the top 180px (where controls are)
        // and bottom 120px (where view count and caption are)
        const touchY = evt.nativeEvent.pageY;
        if (touchY < 180 || touchY > SCREEN_HEIGHT - 120) {
          return false;
        }
        return true;
      },
      onPanResponderGrant: () => {
        isLongPress.current = false;
        // Start long-press timer (300ms to activate pause)
        longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          setIsPaused(true);
          if (currentStory?.media_type === 'video' && videoRef.current) {
            videoRef.current.pauseAsync();
          }
        }, 300);
      },
      onPanResponderMove: (evt, gestureState) => {
        // If user moves finger, cancel long press
        if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Clear long press timer
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // Resume if paused via long press
        if (isLongPress.current) {
          setIsPaused(false);
          if (currentStory?.media_type === 'video' && videoRef.current) {
            videoRef.current.playAsync();
          }
          isLongPress.current = false;
          return;
        }

        const { dx } = gestureState;

        // Swipe left -> Next story
        if (dx < -50) {
          handleNext();
        }
        // Swipe right -> Previous story
        else if (dx > 50) {
          handlePrevious();
        }
      },
    })
  ).current;

  // Debug: Log render attempt
  console.log('📖 [StoryViewer] Render attempt:', {
    visible,
    hasStories: !!stories,
    storiesLength: stories?.length,
    currentIndex,
    hasCurrentStory: !!currentStory,
  });

  if (!visible) {
    console.log('⚠️ [StoryViewer] Not rendering - visible is false');
    return null;
  }

  if (!stories || stories.length === 0) {
    console.log('⚠️ [StoryViewer] Not rendering - no stories');
    return null;
  }

  if (!currentStory) {
    console.log('⚠️ [StoryViewer] Not rendering - currentStory is null', {
      currentIndex,
      storiesLength: stories.length,
    });
    return null;
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Story Content */}
        <View style={styles.contentContainer} {...panResponder.panHandlers}>
          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
          {currentStory.media_type === 'image' ? (
            <Image
              source={{ uri: currentStory.media_url }}
              style={styles.media}
              resizeMode="contain"
              onLoadStart={() => {
                console.log('🖼️ [StoryViewer] Image loading started:', currentStory.media_url);
                setIsLoading(true);
              }}
              onLoadEnd={() => {
                console.log('✅ [StoryViewer] Image loaded successfully');
                setIsLoading(false);
              }}
              onError={(error) => {
                console.error('❌ [StoryViewer] Image load error:', {
                  error,
                  url: currentStory.media_url,
                });
                setIsLoading(false);
                Alert.alert('Error', 'Gagal memuat story. URL: ' + currentStory.media_url);
              }}
            />
          ) : (
            <Video
              ref={videoRef}
              source={{ uri: currentStory.media_url }}
              style={styles.media}
              resizeMode="contain"
              shouldPlay={!isPaused}
              isLooping={false}
              onLoad={() => {
                console.log('✅ [StoryViewer] Video loaded successfully');
                setIsLoading(false);
              }}
              onError={(error) => {
                console.error('❌ [StoryViewer] Video load error:', {
                  error,
                  url: currentStory.media_url,
                });
                setIsLoading(false);
                Alert.alert('Error', 'Gagal memuat video story. URL: ' + currentStory.media_url);
              }}
              onPlaybackStatusUpdate={(status) => {
                if (status.didJustFinish) {
                  handleNext();
                }
              }}
            />
          )}

          {/* Text Elements Overlay */}
          {currentStory.text_elements && (() => {
            try {
              const textElements = typeof currentStory.text_elements === 'string'
                ? JSON.parse(currentStory.text_elements)
                : currentStory.text_elements;

              console.log('📝 [StoryViewer] Rendering text elements:', textElements);

              return Array.isArray(textElements) && textElements.map((element, idx) => {
                // Use percentage-based position if available, otherwise use absolute
                let posX, posY;
                if (element.xPercent !== undefined && element.yPercent !== undefined) {
                  posX = (element.xPercent / 100) * SCREEN_WIDTH;
                  posY = (element.yPercent / 100) * SCREEN_HEIGHT;
                } else {
                  // Fallback to stored x,y or center
                  posX = element.x || SCREEN_WIDTH / 2;
                  posY = element.y || SCREEN_HEIGHT / 3;
                }

                return (
                  <View
                    key={idx}
                    style={[
                      styles.textElementOverlay,
                      {
                        left: posX,
                        top: posY,
                        transform: [{ translateX: -50 }], // Center the text
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.overlayText,
                        {
                          color: element.color || '#FFFFFF',
                          textAlign: element.align || 'center',
                          fontWeight: element.style === 'bold' || element.style === 'strong' ? 'bold' : 'normal',
                          fontStyle: element.style === 'italic' ? 'italic' : 'normal',
                          backgroundColor: element.bgColor || element.backgroundColor || 'transparent',
                          fontSize: element.size || 24,
                        },
                      ]}
                    >
                      {element.text}
                    </Text>
                  </View>
                );
              });
            } catch (e) {
              console.error('Error parsing text elements:', e);
              return null;
            }
          })()}

          {/* Top Bar - Progress Bars (per-user) */}
          <View style={styles.topBar}>
            <View style={styles.progressBarContainer}>
              {(() => {
                // Filter stories to only show bars for the current user
                const currentUserId = Number(currentStory?.user_id);
                const userStories = stories.filter(s => Number(s.user_id) === currentUserId);
                const userStartIndex = stories.findIndex(s => Number(s.user_id) === currentUserId);
                const localIndex = currentIndex - userStartIndex;

                return userStories.map((_, idx) => (
                  <View key={idx} style={styles.progressBarBackground}>
                    {idx < localIndex && (
                      <View style={[styles.progressBarFill, { width: '100%' }]} />
                    )}
                    {idx === localIndex && (
                      <Animated.View
                        style={[styles.progressBarFill, { width: progressWidth }]}
                      />
                    )}
                  </View>
                ));
              })()}
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <View style={styles.userLeft}>
                {currentStory.user?.avatar_url ? (
                  <Image
                    source={{ uri: currentStory.user.avatar_url }}
                    style={styles.userAvatar}
                  />
                ) : (
                  <View style={[styles.userAvatar, styles.defaultUserAvatar]}>
                    <Text style={styles.defaultUserAvatarText}>
                      {currentStory.user?.name?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>{currentStory.user?.name || 'User'}</Text>
                  <Text style={styles.timestamp}>
                    {(() => {
                      const d = new Date(currentStory.created_at);
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                      const hours = d.getHours().toString().padStart(2, '0');
                      const mins = d.getMinutes().toString().padStart(2, '0');
                      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${hours}:${mins}`;
                    })()}
                  </Text>
                </View>
              </View>

              <View style={styles.userRight}>
                <TouchableOpacity onPress={togglePause} style={styles.iconButton}>
                  <Ionicons
                    name={isPaused ? 'play' : 'pause'}
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                {isOwner && (
                  <>
                    {currentStory.is_archived ? (
                      <TouchableOpacity onPress={handleUnarchive} style={styles.iconButton}>
                        <Ionicons name="archive" size={24} color="#3B82F6" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={handleArchive} style={styles.iconButton}>
                        <Ionicons name="archive-outline" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
                      <Ionicons name="trash-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </>
                )}

                {!isOwner && (
                  <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.iconButton}>
                    <Ionicons name="flag-outline" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Navigation Areas - starts below top bar to avoid blocking buttons */}
          <View style={styles.navigationContainer} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.navLeft}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            />
            <TouchableOpacity
              style={styles.navRight}
              onPress={handleNext}
            />
          </View>

          {/* Caption - Positioned above interaction bar */}
          {currentStory.caption && (
            <View style={styles.captionContainer}>
              <Text style={styles.caption} numberOfLines={3}>
                {currentStory.caption}
              </Text>
            </View>
          )}

          {isOwner && (
            <TouchableOpacity
              style={styles.viewCountContainer}
              onPress={handleShowViewers}
              activeOpacity={0.7}
            >
              <Ionicons name="eye" size={16} color="#FFFFFF" />
              <Text style={styles.viewCountText}>{currentStory.view_count || 0}</Text>
            </TouchableOpacity>
          )}

          {/* Reply & Reactions - REMOVED per user request */}
        </View>

        {/* Sticker Elements Overlay - rendered outside contentContainer for touch priority */}
        {currentStory.stickers && (() => {
          try {
            const stickers = typeof currentStory.stickers === 'string'
              ? JSON.parse(currentStory.stickers)
              : currentStory.stickers;

            return Array.isArray(stickers) && stickers.map((sticker, idx) => {
              const posX = sticker.xPercent !== undefined
                ? (sticker.xPercent / 100) * SCREEN_WIDTH
                : SCREEN_WIDTH / 2;
              const posY = sticker.yPercent !== undefined
                ? (sticker.yPercent / 100) * SCREEN_HEIGHT
                : SCREEN_HEIGHT / 3;
              const stickerScale = sticker.scale || 1;
              const hasVoted = pollVotes[idx] !== undefined;
              const selectedOption = pollVotes[idx];
              const options = sticker.data?.options || [];

              const renderStickerOverlay = () => {
                switch (sticker.type) {
                  case 'location':
                    return (
                      <View style={styles.stickerLocationPill}>
                        <Ionicons name="location" size={14} color="#FFFFFF" />
                        <Text style={styles.stickerLocationText}>{sticker.data?.text}</Text>
                      </View>
                    );
                  case 'mention':
                    return (
                      <TouchableOpacity
                        style={styles.stickerMentionPill}
                        activeOpacity={0.7}
                        onPress={() => {
                          setIsPaused(true);
                          Alert.alert(
                            `@${sticker.data?.text}`,
                            'Lihat profil pengguna ini?',
                            [
                              { text: 'Tutup', style: 'cancel', onPress: () => setIsPaused(false) },
                              { text: 'Lihat Profil', onPress: () => setIsPaused(false) },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.stickerMentionText}>@{sticker.data?.text}</Text>
                      </TouchableOpacity>
                    );
                  case 'hashtag':
                    return (
                      <View style={styles.stickerHashtagPill}>
                        <Text style={styles.stickerHashtagText}>#{sticker.data?.text}</Text>
                      </View>
                    );
                  case 'poll':
                    if (isOwner) {
                      // CREATOR VIEW: Show poll results with vote counts
                      const pollResponses = stickerResponses.filter(r => r.type === 'poll_vote' && r.sticker_index === idx);
                      const totalVotes = pollResponses.length;
                      return (
                        <TouchableOpacity
                          style={styles.stickerPollCard}
                          activeOpacity={0.7}
                          onPress={() => {
                            setIsPaused(true);
                            handleShowViewers();
                          }}
                        >
                          <Text style={styles.stickerPollQuestion}>{sticker.data?.text}</Text>
                          {options.map((opt, i) => {
                            const optionVotes = pollResponses.filter(r => r.option_index === i).length;
                            const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                            return (
                              <View key={i} style={[styles.stickerPollOptionBar, styles.stickerPollOptionBarVoted]}>
                                <View style={styles.stickerPollOptionContent}>
                                  <Text style={styles.stickerPollOptionText}>{opt}</Text>
                                  <Text style={styles.stickerPollPercent}>{pct}%</Text>
                                </View>
                                <View
                                  style={[
                                    styles.stickerPollFillBar,
                                    { width: `${Math.max(pct, 5)}%` },
                                    styles.stickerPollFillBarDefault,
                                  ]}
                                />
                              </View>
                            );
                          })}
                          <Text style={styles.stickerPollVoteInfo}>
                            {totalVotes > 0 ? `${totalVotes} suara · Ketuk untuk detail` : 'Belum ada suara · Ketuk untuk detail'}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    // VIEWER: Interactive poll
                    return (
                      <View style={styles.stickerPollCard}>
                        <Text style={styles.stickerPollQuestion}>{sticker.data?.text}</Text>
                        {options.map((opt, i) => {
                          const isSelected = selectedOption === i;
                          const votePercent = hasVoted
                            ? (isSelected ? Math.round(100 / options.length + 15) : Math.round(100 / options.length - 5))
                            : 0;
                          return (
                            <TouchableOpacity
                              key={i}
                              style={[
                                styles.stickerPollOptionBar,
                                hasVoted && styles.stickerPollOptionBarVoted,
                                isSelected && styles.stickerPollOptionBarSelected,
                              ]}
                              activeOpacity={hasVoted ? 1 : 0.7}
                              onPress={async () => {
                                if (!hasVoted) {
                                  setPollVotes(prev => ({ ...prev, [idx]: i }));
                                  try {
                                    await apiService.submitPollVote(currentStory.id, idx, i, opt);
                                  } catch (err) {
                                    console.error('Poll vote error:', err);
                                  }
                                }
                              }}
                            >
                              <View style={styles.stickerPollOptionContent}>
                                <Text style={[
                                  styles.stickerPollOptionText,
                                  isSelected && styles.stickerPollOptionTextSelected,
                                ]}>
                                  {opt}
                                </Text>
                                {hasVoted && (
                                  <Text style={[
                                    styles.stickerPollPercent,
                                    isSelected && styles.stickerPollPercentSelected,
                                  ]}>
                                    {votePercent}%
                                  </Text>
                                )}
                              </View>
                              {hasVoted && (
                                <View
                                  style={[
                                    styles.stickerPollFillBar,
                                    { width: `${votePercent}%` },
                                    isSelected
                                      ? styles.stickerPollFillBarSelected
                                      : styles.stickerPollFillBarDefault,
                                  ]}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                        {hasVoted && (
                          <Text style={styles.stickerPollVoteInfo}>Kamu sudah memilih</Text>
                        )}
                      </View>
                    );
                  case 'question':
                    if (isOwner) {
                      // CREATOR VIEW: Show response count, tap to see all answers
                      const questionResponses = stickerResponses.filter(r => r.type === 'question_answer' && r.sticker_index === idx);
                      return (
                        <TouchableOpacity
                          style={styles.stickerQuestionBox}
                          activeOpacity={0.7}
                          onPress={() => {
                            setIsPaused(true);
                            handleShowViewers();
                          }}
                        >
                          <Text style={styles.stickerQuestionLabel}>
                            {questionResponses.length > 0
                              ? `${questionResponses.length} jawaban`
                              : 'Belum ada jawaban'}
                          </Text>
                          <View style={styles.stickerQuestionContent}>
                            <Text style={styles.stickerQuestionText}>{sticker.data?.text}</Text>
                          </View>
                          {questionResponses.length > 0 ? (
                            <View style={styles.stickerQuestionSentBadge}>
                              <Ionicons name="chatbubbles" size={14} color="#10B981" />
                              <Text style={styles.stickerQuestionSentText}>Ketuk untuk lihat</Text>
                            </View>
                          ) : (
                            <View style={styles.stickerQuestionInputHint}>
                              <Text style={styles.stickerQuestionInputHintText}>Ketuk untuk lihat detail</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    }
                    // VIEWER: Interactive question
                    return (
                      <TouchableOpacity
                        style={styles.stickerQuestionBox}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (!questionSent[idx]) {
                            setIsPaused(true);
                            setActiveQuestionIdx(idx);
                            setActiveQuestionText(sticker.data?.text || '');
                            setQuestionAnswer('');
                            setShowQuestionModal(true);
                          }
                        }}
                      >
                        <Text style={styles.stickerQuestionLabel}>
                          {questionSent[idx] ? 'Jawaban terkirim!' : 'Ketuk untuk menjawab'}
                        </Text>
                        <View style={styles.stickerQuestionContent}>
                          <Text style={styles.stickerQuestionText}>{sticker.data?.text}</Text>
                        </View>
                        {!questionSent[idx] && (
                          <View style={styles.stickerQuestionInputHint}>
                            <Text style={styles.stickerQuestionInputHintText}>Tulis jawaban...</Text>
                          </View>
                        )}
                        {questionSent[idx] && (
                          <View style={styles.stickerQuestionSentBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.stickerQuestionSentText}>Terkirim</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  case 'time':
                    return (
                      <View style={styles.stickerTimeBox}>
                        <Ionicons name="time-outline" size={12} color="#FFFFFF" />
                        <Text style={styles.stickerTimeText}>{sticker.data?.text}</Text>
                      </View>
                    );
                  case 'image':
                    return sticker.data?.imageUri ? (
                      <View style={{
                        width: 150,
                        height: 150,
                        borderRadius: 12,
                        overflow: 'hidden',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                      }}>
                        <Image
                          source={{ uri: sticker.data.imageUri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null;
                  case 'gif':
                    return (
                      <View style={styles.stickerGifBadge}>
                        <Text style={styles.stickerGifText}>GIF</Text>
                      </View>
                    );
                  default:
                    return null;
                }
              };

              return (
                <View
                  key={`sticker-${idx}`}
                  style={{
                    position: 'absolute',
                    left: posX,
                    top: posY,
                    transform: [
                      { translateX: -50 },
                      { scale: stickerScale },
                    ],
                    zIndex: 500,
                    elevation: 500,
                  }}
                >
                  {renderStickerOverlay()}
                </View>
              );
            });
          } catch (e) {
            console.error('Error parsing stickers:', e);
            return null;
          }
        })()}

        {/* Report Modal */}
        <Modal
          visible={showReportModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReportModal(false)}
        >
          <View style={styles.reportModalOverlay}>
            <View style={styles.reportModalContainer}>
              <View style={styles.reportModalHeader}>
                <Text style={styles.reportModalTitle}>Laporkan Story</Text>
                <TouchableOpacity onPress={() => setShowReportModal(false)}>
                  <Ionicons name="close" size={24} color="#000000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.reportModalContent}>
                <Text style={styles.reportLabel}>Pilih Alasan:</Text>

                {[
                  { value: 'spam', label: 'Spam' },
                  { value: 'inappropriate', label: 'Konten Tidak Pantas' },
                  { value: 'harassment', label: 'Pelecehan atau Perundungan' },
                  { value: 'false_information', label: 'Informasi Salah' },
                  { value: 'other', label: 'Lainnya' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.reportOption,
                      reportReason === option.value && styles.reportOptionSelected
                    ]}
                    onPress={() => setReportReason(option.value)}
                  >
                    <View style={[
                      styles.radioButton,
                      reportReason === option.value && styles.radioButtonSelected
                    ]}>
                      {reportReason === option.value && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    <Text style={styles.reportOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.reportLabel}>Detail Tambahan (Opsional):</Text>
                <TextInput
                  style={styles.reportDetailsInput}
                  placeholder="Berikan informasi lebih lanjut..."
                  placeholderTextColor="#999999"
                  value={reportDetails}
                  onChangeText={setReportDetails}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />

                <TouchableOpacity
                  style={[
                    styles.submitReportButton,
                    !reportReason && styles.submitReportButtonDisabled
                  ]}
                  onPress={submitReport}
                  disabled={!reportReason}
                >
                  <Text style={styles.submitReportButtonText}>Kirim Laporan</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Question Answer Modal */}
        <Modal
          visible={showQuestionModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowQuestionModal(false);
            setIsPaused(false);
          }}
        >
          <View style={styles.reportModalOverlay}>
            <View style={styles.reportModalContainer}>
              <View style={styles.reportModalHeader}>
                <Text style={styles.reportModalTitle}>Jawab Pertanyaan</Text>
                <TouchableOpacity onPress={() => {
                  setShowQuestionModal(false);
                  setIsPaused(false);
                }}>
                  <Ionicons name="close" size={24} color="#000000" />
                </TouchableOpacity>
              </View>
              <View style={styles.questionModalContent}>
                <View style={styles.questionModalBubble}>
                  <Text style={styles.questionModalQuestionText}>{activeQuestionText}</Text>
                </View>
                <TextInput
                  style={styles.questionModalInput}
                  placeholder="Tulis jawabanmu..."
                  placeholderTextColor="#9CA3AF"
                  value={questionAnswer}
                  onChangeText={setQuestionAnswer}
                  multiline
                  maxLength={200}
                  autoFocus
                />
                <TouchableOpacity
                  style={[
                    styles.questionModalSendButton,
                    !questionAnswer.trim() && styles.questionModalSendButtonDisabled,
                  ]}
                  onPress={async () => {
                    if (questionAnswer.trim()) {
                      setQuestionSent(prev => ({ ...prev, [activeQuestionIdx]: true }));
                      setShowQuestionModal(false);
                      setIsPaused(false);
                      try {
                        const res = await apiService.submitQuestionAnswer(currentStory.id, activeQuestionIdx, activeQuestionText, questionAnswer.trim());
                        console.log('✅ Question answer submitted:', res.data);
                        Alert.alert('Terkirim!', 'Jawaban kamu telah dikirim.');
                      } catch (err) {
                        console.error('❌ Question answer error:', err);
                        Alert.alert('Info', 'Jawaban kamu telah dicatat.');
                      }
                    }
                  }}
                  disabled={!questionAnswer.trim()}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.questionModalSendText}>Kirim Jawaban</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Viewers Modal */}
        <Modal
          visible={showViewersModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowViewersModal(false)}
        >
          <View style={styles.reportModalOverlay}>
            <View style={styles.reportModalContainer}>
              <View style={styles.reportModalHeader}>
                <View style={styles.viewerHeaderLeft}>
                  <Text style={styles.reportModalTitle}>
                    Dilihat oleh {viewers.length || currentStory.view_count || 0}
                  </Text>
                  <Text style={styles.viewerRefreshIndicator}>
                    ● Data real-time
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowViewersModal(false)}>
                  <Ionicons name="close" size={24} color="#000000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.reportModalContent}>
                {loadingViewers ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={{ color: '#666666', marginTop: 12, fontSize: 14 }}>
                      Memuat data viewers...
                    </Text>
                  </View>
                ) : viewers.length > 0 ? (
                  viewers.map((view, index) => {
                    const viewer = view.viewer || view;
                    return (
                      <View key={index} style={styles.viewerItem}>
                        <View style={styles.viewerAvatar}>
                          {viewer.avatar_url ? (
                            <Image
                              source={{ uri: viewer.avatar_url }}
                              style={styles.viewerAvatarImage}
                            />
                          ) : (
                            <Text style={styles.viewerAvatarText}>
                              {viewer.name?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                          )}
                        </View>
                        <View style={styles.viewerInfo}>
                          <View style={styles.viewerNameRow}>
                            <Text style={styles.viewerName}>{viewer.name}</Text>
                            {viewer.has_badge && (
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color="#10B981"
                                style={{ marginLeft: 4 }}
                              />
                            )}
                          </View>
                          {viewer.account_type && viewer.account_type !== 'user' && (
                            <Text style={styles.viewerAccountType}>
                              {viewer.account_type === 'umkm' ? 'Akun UMKM' :
                               viewer.account_type === 'admin' ? 'Admin' : ''}
                            </Text>
                          )}
                          <Text style={styles.viewerTime}>
                            {formatTimeAgo(view.viewed_at)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Ionicons name="eye-off-outline" size={48} color="#CCCCCC" />
                    <Text style={{ color: '#999999', marginTop: 12 }}>
                      Belum ada yang melihat
                    </Text>
                  </View>
                )}

                {/* Poll Responses Section */}
                {stickerResponses.filter(r => r.type === 'poll_vote').length > 0 && (
                  <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Ionicons name="stats-chart" size={18} color="#10B981" />
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
                        Hasil Poll ({stickerResponses.filter(r => r.type === 'poll_vote').length} suara)
                      </Text>
                    </View>
                    {stickerResponses.filter(r => r.type === 'poll_vote').map((resp, index) => (
                      <View key={`poll-${index}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <View style={styles.viewerAvatar}>
                          {resp.user?.avatar_url ? (
                            <Image source={{ uri: resp.user.avatar_url }} style={styles.viewerAvatarImage} />
                          ) : (
                            <Text style={styles.viewerAvatarText}>
                              {resp.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937' }}>
                            {resp.user?.name || 'User'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46' }}>
                                {resp.option_text || `Opsi ${(resp.option_index || 0) + 1}`}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Question Answers Section */}
                {stickerResponses.filter(r => r.type === 'question_answer').length > 0 && (
                  <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Ionicons name="chatbubbles" size={18} color="#3B82F6" />
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
                        Jawaban ({stickerResponses.filter(r => r.type === 'question_answer').length})
                      </Text>
                    </View>
                    {stickerResponses.filter(r => r.type === 'question_answer').map((resp, index) => (
                      <View key={`qa-${index}`} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <View style={styles.viewerAvatar}>
                            {resp.user?.avatar_url ? (
                              <Image source={{ uri: resp.user.avatar_url }} style={styles.viewerAvatarImage} />
                            ) : (
                              <Text style={styles.viewerAvatarText}>
                                {resp.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                              </Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginLeft: 12 }}>
                            {resp.user?.name || 'User'}
                          </Text>
                          {resp.created_at && (
                            <Text style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
                              {formatTimeAgo(resp.created_at)}
                            </Text>
                          )}
                        </View>
                        <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, marginLeft: 48 }}>
                          <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                            {resp.answer}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Show message when no responses yet */}
                {stickerResponses.length === 0 && currentStory?.stickers && (() => {
                  try {
                    const stickers = typeof currentStory.stickers === 'string'
                      ? JSON.parse(currentStory.stickers) : currentStory.stickers;
                    const hasInteractiveStickers = Array.isArray(stickers) &&
                      stickers.some(s => s.type === 'poll' || s.type === 'question');
                    if (hasInteractiveStickers) {
                      return (
                        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16, alignItems: 'center' }}>
                          <Ionicons name="chatbubbles-outline" size={36} color="#D1D5DB" />
                          <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                            Belum ada respon pada poll atau pertanyaan
                          </Text>
                        </View>
                      );
                    }
                  } catch {}
                  return null;
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const createStyles = (SCREEN_WIDTH, SCREEN_HEIGHT) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    elevation: 1000,
  },
  progressBarContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    overflow: 'hidden',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  defaultUserAvatar: {
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
  },
  userRight: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    zIndex: 1001,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationContainer: {
    position: 'absolute',
    top: 180,
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 1,
  },
  navLeft: {
    flex: 1,
  },
  navRight: {
    flex: 1,
  },
  // Caption Container - positioned at bottom with improved styling
  captionContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    maxWidth: '85%',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    maxHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewCountContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Text Elements Overlay
  textElementOverlay: {
    position: 'absolute',
    zIndex: 10,
  },
  overlayText: {
    fontSize: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 100,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Report Modal
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  reportModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  viewerHeaderLeft: {
    flex: 1,
  },
  viewerRefreshIndicator: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '500',
  },
  reportModalContent: {
    padding: 20,
  },
  reportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    marginTop: 8,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reportOptionSelected: {
    backgroundColor: '#E6F7EF',
    borderColor: '#10B981',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#10B981',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  reportOptionText: {
    fontSize: 15,
    color: '#000000',
  },
  reportDetailsInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#000000',
    minHeight: 100,
    marginBottom: 20,
  },
  submitReportButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitReportButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitReportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Viewer Modal Styles
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  viewerAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  viewerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  viewerInfo: {
    flex: 1,
  },
  viewerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  viewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  viewerAccountType: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginBottom: 2,
  },
  viewerTime: {
    fontSize: 13,
    color: '#666666',
  },
  // Sticker overlay styles
  stickerLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  stickerLocationText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  stickerMentionPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stickerMentionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stickerHashtagPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stickerHashtagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stickerPollCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
  },
  stickerPollQuestion: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  stickerPollOptionBar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  stickerPollOptionBarVoted: {
    backgroundColor: '#F3F4F6',
  },
  stickerPollOptionBarSelected: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  stickerPollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  stickerPollOptionText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '500',
  },
  stickerPollOptionTextSelected: {
    fontWeight: '700',
    color: '#065F46',
  },
  stickerPollPercent: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  stickerPollPercentSelected: {
    color: '#10B981',
    fontWeight: '700',
  },
  stickerPollFillBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    zIndex: 1,
  },
  stickerPollFillBarSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  stickerPollFillBarDefault: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  stickerPollVoteInfo: {
    color: '#9CA3AF',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  stickerQuestionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  stickerQuestionLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stickerQuestionContent: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '100%',
  },
  stickerQuestionText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  stickerQuestionInputHint: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    marginTop: 8,
  },
  stickerQuestionInputHintText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
  },
  stickerQuestionSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  stickerQuestionSentText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  // Question answer modal
  questionModalContent: {
    padding: 20,
  },
  questionModalBubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  questionModalQuestionText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  questionModalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  questionModalSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  questionModalSendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  questionModalSendText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  stickerTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  stickerTimeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stickerGifBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stickerGifText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default StoryViewer;
