import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Animated,
  ActivityIndicator,
  PanResponder,
  InteractionManager,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import useStories from '../../hooks/useStories';

// Safe way to read current value from Animated.Value
// Uses try-catch to handle New Architecture changes in RN 0.81+
const getAnimatedValue = (animatedVal) => {
  try {
    if (animatedVal && typeof animatedVal.__getValue === 'function') return animatedVal.__getValue();
    if (animatedVal && typeof animatedVal._value === 'number') return animatedVal._value;
  } catch (e) {
    // Animated internals may throw in New Architecture
  }
  return 0;
};

// Registry to store refs outside of element objects (avoids serialization crashes)
// Use a Map for proper cleanup support
let elementRefsMap = {};

// Draggable text item component - each text element gets its own drag/pinch handler
const DraggableTextItem = ({ element, onEdit, onDelete, screenWidth, screenHeight, getFontStyle }) => {
  const pan = useRef(new Animated.ValueXY({ x: element.x, y: element.y })).current;
  const scale = useRef(new Animated.Value(element.scale || 1)).current;
  const currentScaleRef = useRef(element.scale || 1);
  const lastDistanceRef = useRef(0);
  const lastScaleRef = useRef(element.scale || 1);
  const touchStartTimeRef = useRef(0);
  const hasMoved = useRef(false);
  const currentPosRef = useRef({ x: element.x, y: element.y });

  // Store refs in external map instead of mutating the element object
  elementRefsMap[element.id] = { panRef: pan, scaleRef: currentScaleRef, posRef: currentPosRef };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3,
      onPanResponderGrant: () => {
        touchStartTimeRef.current = Date.now();
        hasMoved.current = false;
        const curX = getAnimatedValue(pan.x);
        const curY = getAnimatedValue(pan.y);
        pan.setOffset({ x: curX, y: curY });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          hasMoved.current = true;
          const touch1 = touches[0];
          const touch2 = touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          if (lastDistanceRef.current === 0) {
            lastDistanceRef.current = distance;
          } else {
            const scaleChange = distance / lastDistanceRef.current;
            const newScale = Math.min(Math.max(lastScaleRef.current * scaleChange, 0.5), 3);
            scale.setValue(newScale);
            currentScaleRef.current = newScale;
          }
        } else if (touches.length === 1) {
          if (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3) {
            hasMoved.current = true;
          }
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        lastScaleRef.current = currentScaleRef.current;
        lastDistanceRef.current = 0;
        // Store final position in a plain ref (not on the element object)
        currentPosRef.current = {
          x: getAnimatedValue(pan.x),
          y: getAnimatedValue(pan.y),
        };

        // Detect tap: short duration + minimal movement
        const duration = Date.now() - touchStartTimeRef.current;
        const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
        if (duration < 250 && distance < 5 && !hasMoved.current) {
          onEdit(element);
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.draggableTextContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.textPreviewBox,
          { backgroundColor: element.bgColor || 'rgba(0, 0, 0, 0.4)' }
        ]}
      >
        <Text
          style={[
            styles.textPreviewText,
            {
              color: element.color,
              fontSize: element.size,
              textAlign: element.align || 'center',
              ...getFontStyle(element.font),
            },
          ]}
        >
          {element.text}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteTextButton}
        onPress={() => onDelete(element.id)}
      >
        <Ionicons name="close-circle" size={28} color="#FF3B5C" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Render sticker content based on type - with defensive null checks
const renderStickerContent = (sticker) => {
  if (!sticker || !sticker.data) return null;
  const data = sticker.data;

  try {
    switch (sticker.type) {
      case 'location':
        return (
          <View style={stickerStyles.locationPill}>
            <Ionicons name="location" size={16} color="#FFFFFF" />
            <Text style={stickerStyles.locationText}>{data.text || ''}</Text>
          </View>
        );
      case 'mention':
        return (
          <View style={stickerStyles.mentionPill}>
            <Text style={stickerStyles.mentionText}>@{data.text || ''}</Text>
          </View>
        );
      case 'hashtag':
        return (
          <View style={stickerStyles.hashtagPill}>
            <Text style={stickerStyles.hashtagText}>#{data.text || ''}</Text>
          </View>
        );
      case 'poll':
        return (
          <View style={stickerStyles.pollCard}>
            <Text style={stickerStyles.pollQuestion}>{data.text || ''}</Text>
            {(Array.isArray(data.options) ? data.options : []).map((opt, i) => (
              <View key={i} style={stickerStyles.pollOptionBar}>
                <Text style={stickerStyles.pollOptionText}>{String(opt || '')}</Text>
              </View>
            ))}
          </View>
        );
      case 'question':
        return (
          <View style={stickerStyles.questionBox}>
            <Text style={stickerStyles.questionLabel}>Tanyakan sesuatu</Text>
            <View style={stickerStyles.questionContent}>
              <Text style={stickerStyles.questionText}>{data.text || ''}</Text>
            </View>
          </View>
        );
      case 'time':
        return (
          <View style={stickerStyles.timeBox}>
            <Ionicons name="time-outline" size={14} color="#FFFFFF" />
            <Text style={stickerStyles.timeText}>{data.text || ''}</Text>
          </View>
        );
      case 'image':
        return (
          <View style={stickerStyles.imageStickerContainer}>
            {data.imageUri ? (
              <Image
                source={{ uri: data.imageUri }}
                style={stickerStyles.imageStickerImage}
                resizeMode="contain"
              />
            ) : (
              <View style={stickerStyles.imageStickerPlaceholder}>
                <Ionicons name="image-outline" size={24} color="#FFFFFF" />
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  } catch (e) {
    console.error('[StoryEditor] Error rendering sticker content:', e);
    return null;
  }
};

// Draggable sticker item component - same drag/pinch pattern as text
const DraggableStickerItem = ({ sticker, onDelete, screenWidth, screenHeight }) => {
  const pan = useRef(new Animated.ValueXY({ x: sticker.x, y: sticker.y })).current;
  const scale = useRef(new Animated.Value(sticker.scale || 1)).current;
  const currentScaleRef = useRef(sticker.scale || 1);
  const lastDistanceRef = useRef(0);
  const lastScaleRef = useRef(sticker.scale || 1);
  const hasMoved = useRef(false);
  const currentPosRef = useRef({ x: sticker.x, y: sticker.y });

  // Store refs in external map instead of mutating the sticker object
  elementRefsMap[`sticker_${sticker.id}`] = { panRef: pan, scaleRef: currentScaleRef, posRef: currentPosRef };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3,
      onPanResponderGrant: () => {
        hasMoved.current = false;
        const curX = getAnimatedValue(pan.x);
        const curY = getAnimatedValue(pan.y);
        pan.setOffset({ x: curX, y: curY });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches || [];
        if (touches.length === 2) {
          hasMoved.current = true;
          const touch1 = touches[0];
          const touch2 = touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          if (lastDistanceRef.current === 0) {
            lastDistanceRef.current = distance;
          } else {
            const scaleChange = distance / lastDistanceRef.current;
            const newScale = Math.min(Math.max(lastScaleRef.current * scaleChange, 0.5), 3);
            scale.setValue(newScale);
            currentScaleRef.current = newScale;
          }
        } else if (touches.length === 1) {
          if (Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3) {
            hasMoved.current = true;
          }
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        lastScaleRef.current = currentScaleRef.current;
        lastDistanceRef.current = 0;
        currentPosRef.current = {
          x: getAnimatedValue(pan.x),
          y: getAnimatedValue(pan.y),
        };
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.draggableTextContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {renderStickerContent(sticker)}
      <TouchableOpacity
        style={styles.deleteTextButton}
        onPress={() => onDelete(sticker.id)}
      >
        <Ionicons name="close-circle" size={28} color="#FF3B5C" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ... (rest of the presets and constants)

const StoryEditorScreenSimple = ({ route }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const navigation = useNavigation();
  const { uploadStory } = useStories();
  const { mediaUri, mediaType } = route.params;

  // Video ref for proper cleanup
  const videoRef = useRef(null);
  const isMountedRef = useRef(true);
  const isPostingRef = useRef(false);

  // Text states - now supports multiple text elements
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [selectedBgColor, setSelectedBgColor] = useState('transparent');
  const [selectedFont, setSelectedFont] = useState('default');
  const [textSize, setTextSize] = useState(28);
  const [textAlign, setTextAlign] = useState('center');
  const [textElements, setTextElements] = useState([]);
  const [editingElementId, setEditingElementId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState('normal');

  // Sticker states
  const [stickerElements, setStickerElements] = useState([]);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [stickerSearchQuery, setStickerSearchQuery] = useState('');

  // Per-type input modals
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showMentionInput, setShowMentionInput] = useState(false);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [showPollInput, setShowPollInput] = useState(false);
  const [showQuestionInput, setShowQuestionInput] = useState(false);

  // Input values
  const [locationInput, setLocationInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [questionInput, setQuestionInput] = useState('');

  // Track element IDs in a ref so cleanup can access the latest values
  const textElementIdsRef = useRef([]);
  const stickerElementIdsRef = useRef([]);
  useEffect(() => { textElementIdsRef.current = textElements.map(el => el.id); }, [textElements]);
  useEffect(() => { stickerElementIdsRef.current = stickerElements.map(s => s.id); }, [stickerElements]);

  // Cleanup elementRefsMap and video on unmount to prevent native crashes
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isPostingRef.current = false;
      
      // CRITICAL: Force exhaustive video cleanup on unmount
      if (videoRef.current) {
        const v = videoRef.current;
        try {
          v.stopAsync().catch(() => {});
          v.unloadAsync().catch(() => {});
        } catch (e) { /* ignore */ }
      }
      
      // Clean up element refs for this session to prevent stale animated value crashes
      const textIds = textElementIdsRef.current || [];
      const stickerIds = (stickerElementIdsRef.current || []).map(id => `sticker_${id}`);
      [...textIds, ...stickerIds].forEach(id => {
        delete elementRefsMap[id];
      });
    };
  }, []);

  // Direct post story - with enhanced crash protection and memory management
  const handlePost = async () => {
    if (isPostingRef.current) return;
    isPostingRef.current = true;

    console.log('📌 [StoryEditor] handlePost initiated');

    try {
      // 1. Snapshot all data FIRST before any state changes trigger re-renders
      // This ensures we have a stable copy of current positions
      const textSnapshot = textElements.map(el => {
        const refs = elementRefsMap[el.id];
        const pos = refs?.posRef?.current;
        return {
          ...el,
          _finalX: pos ? pos.x : el.x,
          _finalY: pos ? pos.y : el.y,
          _finalScale: refs?.scaleRef?.current || el.scale || 1,
        };
      });

      const stickerSnapshot = stickerElements.map(s => {
        const refs = elementRefsMap[`sticker_${s.id}`];
        const pos = refs?.posRef?.current;
        return {
          ...s,
          _finalX: pos ? pos.x : s.x,
          _finalY: pos ? pos.y : s.y,
          _finalScale: refs?.scaleRef?.current || s.scale || 1,
        };
      });

      // 2. Prepare serializable payloads
      const textElementsData = textSnapshot.map(el => ({
        text: String(el.text || ''),
        color: String(el.color || '#FFFFFF'),
        bgColor: String(el.bgColor || 'transparent'),
        font: String(el.font || 'default'),
        size: Number(el.size) || 28,
        align: String(el.align || 'center'),
        xPercent: Math.max(0, Math.min(100, (el._finalX / SCREEN_WIDTH) * 100)) || 0,
        yPercent: Math.max(0, Math.min(100, (el._finalY / SCREEN_HEIGHT) * 100)) || 0,
        scale: Number(el._finalScale) || 1,
      }));

      const stickerElementsData = stickerSnapshot.map(s => {
        let cleanData = {};
        try {
          cleanData = JSON.parse(JSON.stringify(s.data || {}));
        } catch (e) {
          cleanData = { text: String(s.data?.text || '') };
        }
        return {
          type: String(s.type),
          data: cleanData,
          xPercent: Math.max(0, Math.min(100, (s._finalX / SCREEN_WIDTH) * 100)) || 0,
          yPercent: Math.max(0, Math.min(100, (s._finalY / SCREEN_HEIGHT) * 100)) || 0,
          scale: Number(s._finalScale) || 1,
        };
      });

      const textJson = textElementsData.length > 0 ? JSON.stringify(textElementsData) : null;
      const stickersPayload = stickerElementsData.length > 0 ? stickerElementsData : null;

      // 3. CRITICAL: Stop and UNLOAD video immediately to free up maximum memory
      // Re-rendering with a progress overlay while a video is still decoding often causes OOM
      if (videoRef.current) {
        try {
          await videoRef.current.stopAsync();
          await videoRef.current.unloadAsync();
          console.log('📌 [StoryEditor] Video unloaded to free memory');
        } catch (e) {
          console.warn('📌 [StoryEditor] Video cleanup warning:', e.message);
        }
      }

      // 4. Now show upload UI (this triggers re-render)
      setIsUploading(true);

      // 5. Small delay to let the UI update before heavy upload
      await new Promise(resolve => setTimeout(resolve, 300));

      // 6. Execute upload
      console.log('📌 [StoryEditor] Executing uploadStory...');
      await uploadStory(mediaUri, mediaType, {
        caption: null,
        duration: mediaType === 'video' ? 15 : 5,
        text_elements: textJson,
        stickers: stickersPayload,
        filter: selectedFilter !== 'normal' ? selectedFilter : null,
      });

      console.log('📌 [StoryEditor] Upload successful');

      // 7. Navigate away safely
      if (isMountedRef.current) {
        // Direct navigation is safer than InteractionManager in some cases
        try {
          navigation.popToTop();
        } catch (navErr) {
          try { navigation.goBack(); } catch (e) {}
        }
      }
    } catch (error) {
      console.error('📌 [StoryEditor] Critical upload error:', error?.message || error);
      
      if (isMountedRef.current) {
        setIsUploading(false);
        Alert.alert('Error', error?.message || 'Gagal memposting story. Silakan coba lagi.');
        // Note: We don't reload the video here to avoid further complexity/crashes
      }
    } finally {
      isPostingRef.current = false;
    }
  };

  // Render a simple input modal for a sticker type
  const renderInputModal = (visible, onClose, title, value, onChangeText, onConfirm, placeholder) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.stickerInputModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onConfirm}>
              <Ionicons name="checkmark" size={28} color="#10B981" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={onChangeText}
            maxLength={50}
            autoFocus
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Media Background */}
      <View style={styles.mediaContainer}>
        {mediaType === 'image' ? (
          <Image source={{ uri: mediaUri }} style={styles.media} resizeMode="cover" />
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: mediaUri }}
            style={styles.media}
            resizeMode="cover"
            shouldPlay={!isUploading}
            isLooping
            isMuted
          />
        )}
        {/* Filter Overlay */}
        {selectedFilter !== 'normal' && (
          <View
            style={[
              styles.filterOverlay,
              { backgroundColor: FILTER_PRESETS.find(f => f.id === selectedFilter)?.overlay },
            ]}
            pointerEvents="none"
          />
        )}
      </View>

      {/* Draggable Text Elements - Hide during upload to free UI resources */}
      {!isUploading && textElements.map((element) => (
        <DraggableTextItem
          key={element.id}
          element={element}
          onEdit={handleEditText}
          onDelete={handleDeleteText}
          screenWidth={SCREEN_WIDTH}
          screenHeight={SCREEN_HEIGHT}
          getFontStyle={getFontStyle}
        />
      ))}

      {/* Draggable Sticker Elements - Hide during upload to free UI resources */}
      {!isUploading && stickerElements.map((sticker) => (
        <DraggableStickerItem
          key={sticker.id}
          sticker={sticker}
          onDelete={handleDeleteSticker}
          screenWidth={SCREEN_WIDTH}
          screenHeight={SCREEN_HEIGHT}
        />
      ))}

      {/* Drag hint - shown when there are draggable elements and not uploading */}
      {!isUploading && (textElements.length > 0 || stickerElements.length > 0) && (
        <View style={styles.dragHintContainer}>
          <Text style={styles.dragHint}>Geser untuk pindah, 2 jari untuk zoom</Text>
        </View>
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          disabled={isUploading}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.addTextTopButton}
            onPress={() => setShowStickerPanel(true)}
            disabled={isUploading}
          >
            <Ionicons name="happy-outline" size={24} color="#FFFFFF" />
            <Text style={styles.addTextTopLabel}>
              {stickerElements.length > 0 ? `Stiker (${stickerElements.length})` : 'Stiker'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addTextTopButton}
            onPress={handleOpenAddText}
            disabled={isUploading}
          >
            <Ionicons name="text" size={24} color="#FFFFFF" />
            <Text style={styles.addTextTopLabel}>
              {textElements.length > 0 ? `Teks (${textElements.length})` : 'Teks'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addTextTopButton, selectedFilter !== 'normal' && { backgroundColor: 'rgba(16, 185, 129, 0.5)' }]}
            onPress={() => {
              // Cycle to next filter
              const currentIndex = FILTER_PRESETS.findIndex(f => f.id === selectedFilter);
              const nextIndex = (currentIndex + 1) % FILTER_PRESETS.length;
              setSelectedFilter(FILTER_PRESETS[nextIndex].id);
            }}
            disabled={isUploading}
          >
            <Ionicons name="color-filter" size={24} color="#FFFFFF" />
            <Text style={styles.addTextTopLabel}>
              {selectedFilter !== 'normal' ? FILTER_PRESETS.find(f => f.id === selectedFilter)?.name : 'Filter'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Selector Bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTER_PRESETS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterItem,
                selectedFilter === filter.id && styles.filterItemSelected,
              ]}
              onPress={() => setSelectedFilter(filter.id)}
              disabled={isUploading}
            >
              <View style={[
                styles.filterPreviewContainer,
                selectedFilter === filter.id && { borderColor: '#10B981' },
              ]}>
                {/* Only render thumbnail for image media to avoid memory crashes.
                    For video, show a colored placeholder instead of decoding 10 video frames. */}
                {mediaType === 'image' ? (
                  <Image
                    source={{ uri: mediaUri }}
                    style={styles.filterPreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.filterPreviewImage, { backgroundColor: '#374151' }]} />
                )}
                {filter.overlay && (
                  <View
                    style={[styles.filterPreviewOverlay, { backgroundColor: filter.overlay }]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.filterName,
                  selectedFilter === filter.id && styles.filterNameSelected,
                ]}
              >
                {filter.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.postButton, isUploading && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.postButtonText}>Post Story</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.uploadText}>Uploading story...</Text>
          </View>
        </View>
      )}

      {/* Text Editor Modal */}
      <Modal
        visible={showTextModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTextModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowTextModal(false); setEditingElementId(null); }}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingElementId ? 'Edit Teks' : 'Tambah Teks'}
              </Text>
              <TouchableOpacity onPress={handleAddText}>
                <Ionicons name="checkmark" size={28} color="#10B981" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Text Preview */}
              <View style={[styles.modalPreview, { backgroundColor: selectedBgColor === 'transparent' ? '#1F2937' : selectedBgColor }]}>
                <Text
                  style={[
                    styles.previewText,
                    {
                      color: selectedColor,
                      fontSize: textSize,
                      textAlign: textAlign,
                      width: '100%',
                      ...getFontStyle(selectedFont),
                    },
                  ]}
                >
                  {textInput || 'Preview'}
                </Text>
              </View>

              {/* Text Input */}
              <TextInput
                style={styles.textInput}
                placeholder="Ketik teks di sini..."
                placeholderTextColor="#9CA3AF"
                value={textInput}
                onChangeText={setTextInput}
                maxLength={100}
                multiline={true}
                autoFocus={true}
              />

              {/* Font Selection */}
              <Text style={styles.sectionLabel}>Font</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fontScrollContent}
              >
                {fonts.map((font) => (
                  <TouchableOpacity
                    key={font.id}
                    style={[
                      styles.fontButton,
                      selectedFont === font.id && styles.fontButtonSelected,
                    ]}
                    onPress={() => setSelectedFont(font.id)}
                  >
                    <Text
                      style={[
                        styles.fontButtonText,
                        { fontFamily: font.fontFamily, fontWeight: font.fontWeight },
                        selectedFont === font.id && styles.fontButtonTextSelected,
                      ]}
                    >
                      {font.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Text Alignment */}
              <Text style={styles.sectionLabel}>Perataan Teks</Text>
              <View style={styles.alignmentRow}>
                {[
                  { id: 'left', icon: 'reorder-three-outline', label: 'Kiri' },
                  { id: 'center', icon: 'reorder-three-outline', label: 'Tengah' },
                  { id: 'right', icon: 'reorder-three-outline', label: 'Kanan' },
                ].map((align) => (
                  <TouchableOpacity
                    key={align.id}
                    style={[
                      styles.alignmentButton,
                      textAlign === align.id && styles.alignmentButtonSelected,
                    ]}
                    onPress={() => setTextAlign(align.id)}
                  >
                    <View style={styles.alignmentIconBox}>
                      {align.id === 'left' && (
                        <>
                          <View style={[styles.alignLine, { width: '100%' }]} />
                          <View style={[styles.alignLine, { width: '70%', alignSelf: 'flex-start' }]} />
                          <View style={[styles.alignLine, { width: '85%', alignSelf: 'flex-start' }]} />
                        </>
                      )}
                      {align.id === 'center' && (
                        <>
                          <View style={[styles.alignLine, { width: '100%' }]} />
                          <View style={[styles.alignLine, { width: '70%', alignSelf: 'center' }]} />
                          <View style={[styles.alignLine, { width: '85%', alignSelf: 'center' }]} />
                        </>
                      )}
                      {align.id === 'right' && (
                        <>
                          <View style={[styles.alignLine, { width: '100%' }]} />
                          <View style={[styles.alignLine, { width: '70%', alignSelf: 'flex-end' }]} />
                          <View style={[styles.alignLine, { width: '85%', alignSelf: 'flex-end' }]} />
                        </>
                      )}
                    </View>
                    <Text style={[
                      styles.alignmentLabel,
                      textAlign === align.id && styles.alignmentLabelSelected,
                    ]}>{align.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Text Color Palette */}
              <Text style={styles.sectionLabel}>Warna Teks</Text>
              <View style={styles.colorPalette}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorButtonSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>

              {/* Background Color Palette */}
              <Text style={styles.sectionLabel}>Warna Latar Teks</Text>
              <View style={styles.colorPalette}>
                {bgColors.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.bgColorButton,
                      { backgroundColor: color === 'transparent' ? '#E5E7EB' : color },
                      selectedBgColor === color && styles.colorButtonSelected,
                    ]}
                    onPress={() => setSelectedBgColor(color)}
                  >
                    {color === 'transparent' && (
                      <View style={styles.transparentLine} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Size Slider */}
              <Text style={styles.sectionLabel}>Ukuran: {textSize}px</Text>
              <Slider
                style={styles.sizeSlider}
                minimumValue={16}
                maximumValue={48}
                step={1}
                value={textSize}
                onValueChange={setTextSize}
                minimumTrackTintColor="#10B981"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#10B981"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sticker Panel Modal */}
      <Modal
        visible={showStickerPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStickerPanel(false)}
      >
        <TouchableOpacity
          style={styles.stickerPanelOverlay}
          activeOpacity={1}
          onPress={() => setShowStickerPanel(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.stickerPanelContainer}>
            <View style={styles.stickerPanelHandle} />
            <Text style={styles.stickerPanelTitle}>Stiker</Text>

            {/* Search Bar */}
            <View style={styles.stickerSearchContainer}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.stickerSearchInput}
                placeholder="Cari stiker..."
                placeholderTextColor="#9CA3AF"
                value={stickerSearchQuery}
                onChangeText={setStickerSearchQuery}
              />
            </View>

            {/* Sticker Grid */}
            <View style={styles.stickerGrid}>
              {filteredStickerTypes.map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={styles.stickerTile}
                  onPress={() => handleStickerTypeSelect(item.type)}
                >
                  <Ionicons name={item.icon} size={28} color="#065F46" />
                  <Text style={styles.stickerTileLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sticker Input Modals */}
      {renderInputModal(
        showLocationInput,
        () => setShowLocationInput(false),
        'Tambah Lokasi',
        locationInput,
        setLocationInput,
        handleConfirmLocation,
        'Nama tempat...'
      )}
      {renderInputModal(
        showMentionInput,
        () => setShowMentionInput(false),
        'Tambah Mention',
        mentionInput,
        setMentionInput,
        handleConfirmMention,
        'Username...'
      )}
      {renderInputModal(
        showHashtagInput,
        () => setShowHashtagInput(false),
        'Tambah Hashtag',
        hashtagInput,
        setHashtagInput,
        handleConfirmHashtag,
        'Hashtag...'
      )}
      {renderInputModal(
        showQuestionInput,
        () => setShowQuestionInput(false),
        'Tambah Pertanyaan',
        questionInput,
        setQuestionInput,
        handleConfirmQuestion,
        'Tulis pertanyaan...'
      )}

      {/* Poll Input Modal */}
      <Modal visible={showPollInput} transparent animationType="fade" onRequestClose={() => setShowPollInput(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.stickerInputModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPollInput(false)}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Tambah Polling</Text>
              <TouchableOpacity onPress={handleConfirmPoll}>
                <Ionicons name="checkmark" size={28} color="#10B981" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Pertanyaan polling..."
              placeholderTextColor="#9CA3AF"
              value={pollQuestion}
              onChangeText={setPollQuestion}
              maxLength={80}
              autoFocus
            />
            {pollOptions.map((opt, idx) => (
              <TextInput
                key={idx}
                style={[styles.textInput, { marginTop: 8 }]}
                placeholder={`Opsi ${idx + 1}...`}
                placeholderTextColor="#9CA3AF"
                value={opt}
                onChangeText={(val) => {
                  const newOpts = [...pollOptions];
                  newOpts[idx] = val;
                  setPollOptions(newOpts);
                }}
                maxLength={30}
              />
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Sticker-specific styles
const stickerStyles = StyleSheet.create({
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mentionPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mentionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hashtagPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hashtagText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pollCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 14,
    minWidth: 180,
  },
  pollQuestion: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  pollOptionBar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  pollOptionText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '500',
  },
  questionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 14,
    minWidth: 180,
    alignItems: 'center',
  },
  questionLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionContent: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  questionText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  imageStickerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  imageStickerImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  imageStickerPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  filterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  filterBar: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 10,
  },
  filterScrollContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  filterItem: {
    alignItems: 'center',
    width: 64,
  },
  filterItemSelected: {
    opacity: 1,
  },
  filterPreviewContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterPreviewImage: {
    width: '100%',
    height: '100%',
  },
  filterPreviewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  filterName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  filterNameSelected: {
    color: '#10B981',
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  addTextTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addTextTopLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  draggableTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  textPreviewBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    maxWidth: 300,
  },
  textPreviewText: {
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  deleteTextButton: {
    position: 'absolute',
    top: -14,
    right: -14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  dragHintContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  dragHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  postButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
  },
  postButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  uploadContainer: {
    alignItems: 'center',
    gap: 16,
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalPreview: {
    borderRadius: 12,
    padding: 20,
    minHeight: 80,
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewText: {
  },
  textInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
    minHeight: 50,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  fontScrollContent: {
    gap: 10,
    marginBottom: 16,
  },
  fontButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  fontButtonSelected: {
    backgroundColor: '#10B981',
  },
  fontButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  fontButtonTextSelected: {
    color: '#FFFFFF',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgColorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  transparentLine: {
    width: 40,
    height: 2,
    backgroundColor: '#FF3B5C',
    transform: [{ rotate: '-45deg' }],
  },
  colorButtonSelected: {
    borderColor: '#10B981',
    borderWidth: 3,
  },
  sizeSlider: {
    width: '100%',
    height: 40,
  },
  alignmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  alignmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  alignmentButtonSelected: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  alignmentIconBox: {
    width: 32,
    height: 20,
    justifyContent: 'center',
    gap: 3,
  },
  alignLine: {
    height: 2,
    backgroundColor: '#6B7280',
    borderRadius: 1,
  },
  alignmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  alignmentLabelSelected: {
    color: '#10B981',
  },
  // Sticker Panel Styles
  stickerPanelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  stickerPanelContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  stickerPanelHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  stickerPanelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  stickerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  stickerSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  stickerTile: {
    width: '47%',
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stickerTileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  // Sticker Input Modal
  stickerInputModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    padding: 20,
  },
});

export default StoryEditorScreenSimple;
