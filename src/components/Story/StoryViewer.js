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
  Keyboard,
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
}) => {
  // Validate initialIndex - ensure it's within bounds
  const safeInitialIndex = React.useMemo(() => {
    if (!stories || stories.length === 0) return 0;
    if (initialIndex < 0 || initialIndex >= stories.length) {
      console.warn('⚠️ [StoryViewer] Invalid initialIndex:', initialIndex, '- using 0');
      return 0;
    }
    return initialIndex;
  }, [initialIndex, stories]);

  // FIRST LOG - Check if component is being called
  console.log('🚀 [StoryViewer] Component function called', {
    visible,
    storiesCount: stories?.length,
    initialIndex,
    safeInitialIndex,
  });

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const { user } = useAuth();
  const { markAsViewed, deleteStory, archiveStory, unarchiveStory, getViewers } = useStories();

  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const progressInterval = useRef(null);
  const videoRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Ensure currentIndex is always valid
  const safeCurrentIndex = React.useMemo(() => {
    if (!stories || stories.length === 0) return 0;
    if (currentIndex < 0 || currentIndex >= stories.length) {
      return 0;
    }
    return currentIndex;
  }, [currentIndex, stories]);

  const currentStory = stories[safeCurrentIndex];
  const isOwner = user?.id === currentStory?.user_id;

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

    const duration = currentStory.duration * 1000; // Convert to milliseconds

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

  // Mark as viewed
  useEffect(() => {
    if (visible && currentStory && !currentStory.has_viewed && !isOwner) {
      markAsViewed(currentStory.id);
    }
  }, [currentIndex, visible, currentStory, isOwner]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (visible) {
      // Use safeInitialIndex instead of initialIndex to prevent invalid index
      setCurrentIndex(safeInitialIndex);
      setProgress(0);
      setIsPaused(false);
    } else {
      progressAnim.setValue(0);
      if (videoRef.current) {
        videoRef.current.stopAsync();
      }
    }
  }, [visible, safeInitialIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      const nextStory = stories[currentIndex + 1];
      const currentStory = stories[currentIndex];

      // RESET PROGRESS when switching to a different user
      if (nextStory.user_id !== currentStory.user_id) {
        console.log('📊 [StoryViewer] Switching to new user, resetting progress');
        progressAnim.setValue(0);
      }

      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      progressAnim.setValue(0);
      onStoryChange?.(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevStory = stories[currentIndex - 1];
      const currentStory = stories[currentIndex];

      // RESET PROGRESS when switching to a different user
      if (prevStory.user_id !== currentStory.user_id) {
        console.log('📊 [StoryViewer] Switching to new user, resetting progress');
        progressAnim.setValue(0);
      }

      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      progressAnim.setValue(0);
      onStoryChange?.(currentIndex - 1);
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
              if (stories.length > 1) {
                if (currentIndex > 0) {
                  setCurrentIndex(currentIndex - 1);
                } else {
                  handleNext();
                }
              } else {
                onClose();
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
      Alert.alert('Success', 'Story archived successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to archive story');
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchiveStory(currentStory.id);
      Alert.alert('Success', 'Story unarchived successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to unarchive story');
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

  const handleShowViewers = async () => {
    if (!isOwner) return;

    setLoadingViewers(true);
    setShowViewersModal(true);

    try {
      const viewersList = await getViewers(currentStory.id);
      setViewers(viewersList || []);
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
          const viewersList = await getViewers(currentStory.id);
          setViewers(viewersList || []);
        } catch (err) {
          console.error('Error refreshing viewers:', err);
        }
      }, 5000); // Refresh every 5 seconds
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
    safeCurrentIndex,
    hasCurrentStory: !!currentStory,
  });

  if (!visible) {
    console.log('⚠️ [StoryViewer] Not rendering - visible is false');
    return null;
  }

  if (!stories || stories.length === 0) {
    console.log('⚠️ [StoryViewer] Not rendering - no stories');
    // Show a modal with message instead of returning null
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#1F2937', padding: 24, borderRadius: 16, alignItems: 'center', maxWidth: '80%' }}>
            <Ionicons name="images-outline" size={64} color="#9CA3AF" />
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
              Story Tidak Tersedia
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Story ini mungkin sudah kadaluarsa atau dihapus.
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ marginTop: 20, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!currentStory) {
    console.log('⚠️ [StoryViewer] currentStory is null, trying to recover', {
      currentIndex,
      safeCurrentIndex,
      storiesLength: stories.length,
    });
    // Try to use the first story as fallback
    const fallbackStory = stories[0];
    if (!fallbackStory) {
      return (
        <Modal
          visible={visible}
          animationType="fade"
          transparent={true}
          onRequestClose={onClose}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#1F2937', padding: 24, borderRadius: 16, alignItems: 'center', maxWidth: '80%' }}>
              <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
                Terjadi Kesalahan
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                Gagal memuat story. Silakan coba lagi.
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{ marginTop: 20, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    }
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
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Story Content */}
        <View style={styles.contentContainer} {...panResponder.panHandlers}>
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
                          backgroundColor: element.backgroundColor || 'transparent',
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
                const currentUserId = currentStory?.user_id;
                const userStories = stories.filter(s => s.user_id === currentUserId);
                const userStartIndex = stories.findIndex(s => s.user_id === currentUserId);
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
                <View>
                  <Text style={styles.userName}>{currentStory.user?.name || 'User'}</Text>
                  <Text style={styles.timestamp}>
                    {new Date(currentStory.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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

                <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Navigation Areas - starts below top bar to avoid blocking buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.navLeft}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            />
            <TouchableOpacity
              style={styles.navRight}
              onPress={handleNext}
              disabled={currentIndex === stories.length - 1}
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
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    gap: 12,
  },
  iconButton: {
    padding: 8,
    zIndex: 1001,
    minWidth: 40,
    minHeight: 40,
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
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  viewerAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
});

export default StoryViewer;
