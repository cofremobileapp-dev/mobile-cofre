import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import useStories from '../../hooks/useStories';

const StoryEditorScreenSimple = ({ route }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const navigation = useNavigation();
  const { uploadStory } = useStories();
  const { mediaUri, mediaType } = route.params;

  // Text states
  const [showTextModal, setShowTextModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [selectedBgColor, setSelectedBgColor] = useState('transparent');
  const [selectedFont, setSelectedFont] = useState('default');
  const [textSize, setTextSize] = useState(28);
  const [textElement, setTextElement] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Position and scale for drag and pinch
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH / 2 - 100, y: SCREEN_HEIGHT / 2 - 100 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [currentScale, setCurrentScale] = useState(1);
  const lastScale = useRef(1);
  const lastDistance = useRef(0);

  // Pan responder for drag and pinch zoom
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // Pinch zoom
          const touch1 = touches[0];
          const touch2 = touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );

          if (lastDistance.current === 0) {
            lastDistance.current = distance;
          } else {
            const scaleChange = distance / lastDistance.current;
            const newScale = Math.min(Math.max(lastScale.current * scaleChange, 0.5), 3);
            scale.setValue(newScale);
            setCurrentScale(newScale);
          }
        } else if (touches.length === 1) {
          // Single finger drag
          Animated.event(
            [null, { dx: pan.x, dy: pan.y }],
            { useNativeDriver: false }
          )(evt, gestureState);
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        lastScale.current = currentScale;
        lastDistance.current = 0;
      },
    })
  ).current;

  // Font options
  const fonts = [
    { id: 'default', label: 'Default', fontFamily: undefined },
    { id: 'serif', label: 'Serif', fontFamily: 'serif' },
    { id: 'mono', label: 'Mono', fontFamily: 'monospace' },
    { id: 'bold', label: 'Bold', fontWeight: 'bold' },
  ];

  // Color palette for text
  const colors = [
    '#FFFFFF', '#000000', '#FF3B5C', '#3B82F6',
    '#FBBF24', '#8B5CF6', '#EC4899', '#10B981',
    '#FF9500', '#00D4FF',
  ];

  // Background colors for text
  const bgColors = [
    'transparent', 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.5)',
    'rgba(255,59,92,0.7)', 'rgba(59,130,246,0.7)',
    'rgba(251,191,36,0.7)', 'rgba(16,185,129,0.7)',
  ];

  // Add or update text
  const handleAddText = () => {
    if (!textInput.trim()) {
      setShowTextModal(false);
      return;
    }

    const newTextElement = {
      id: Date.now().toString(),
      text: textInput.trim(),
      color: selectedColor,
      bgColor: selectedBgColor,
      font: selectedFont,
      size: textSize,
      scale: currentScale,
    };

    setTextElement(newTextElement);
    setTextInput('');
    setShowTextModal(false);
  };

  // Edit existing text
  const handleEditText = () => {
    if (textElement) {
      setTextInput(textElement.text);
      setSelectedColor(textElement.color);
      setSelectedBgColor(textElement.bgColor || 'transparent');
      setSelectedFont(textElement.font);
      setTextSize(textElement.size);
    }
    setShowTextModal(true);
  };

  // Delete text
  const handleDeleteText = () => {
    setTextElement(null);
    pan.setValue({ x: SCREEN_WIDTH / 2 - 100, y: SCREEN_HEIGHT / 2 - 100 });
    scale.setValue(1);
    setCurrentScale(1);
    lastScale.current = 1;
  };

  // Get font style
  const getFontStyle = (fontId) => {
    const font = fonts.find(f => f.id === fontId);
    if (!font) return {};
    return {
      fontFamily: font.fontFamily,
      fontWeight: font.fontWeight || 'normal',
    };
  };

  // Direct post story
  const handlePost = async () => {
    try {
      setIsUploading(true);

      // Get final position as percentage
      const xPercent = ((pan.x._value + pan.x._offset) / SCREEN_WIDTH) * 100;
      const yPercent = ((pan.y._value + pan.y._offset) / SCREEN_HEIGHT) * 100;

      // Prepare text elements data
      const textElementsData = textElement ? [{
        text: textElement.text,
        color: textElement.color,
        bgColor: textElement.bgColor,
        font: textElement.font,
        size: textElement.size,
        xPercent: Math.max(0, Math.min(100, xPercent)),
        yPercent: Math.max(0, Math.min(100, yPercent)),
        scale: currentScale,
      }] : [];

      await uploadStory(mediaUri, mediaType, {
        caption: null,
        duration: mediaType === 'video' ? 15 : 5,
        text_elements: textElementsData.length > 0 ? JSON.stringify(textElementsData) : null,
      });

      // Success - navigate back to home
      navigation.popToTop();
    } catch (error) {
      console.error('Error posting story:', error);

      let errorMessage = 'Gagal memposting story. Silakan coba lagi.';
      if (error.response?.status === 413) {
        errorMessage = 'File terlalu besar. Maksimal 50MB untuk video.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Media Background */}
      <View style={styles.mediaContainer}>
        {mediaType === 'image' ? (
          <Image source={{ uri: mediaUri }} style={styles.media} resizeMode="cover" />
        ) : (
          <Video
            source={{ uri: mediaUri }}
            style={styles.media}
            resizeMode="cover"
            shouldPlay
            isLooping
            isMuted
          />
        )}
      </View>

      {/* Draggable Text Preview */}
      {textElement && (
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
          <TouchableOpacity
            style={[
              styles.textPreviewBox,
              { backgroundColor: textElement.bgColor || 'rgba(0, 0, 0, 0.4)' }
            ]}
            onPress={handleEditText}
            activeOpacity={0.9}
          >
            <Text
              style={[
                styles.textPreviewText,
                {
                  color: textElement.color,
                  fontSize: textElement.size,
                  ...getFontStyle(textElement.font),
                },
              ]}
            >
              {textElement.text}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteTextButton}
            onPress={handleDeleteText}
          >
            <Ionicons name="close-circle" size={28} color="#FF3B5C" />
          </TouchableOpacity>
          <Text style={styles.dragHint}>Geser untuk pindah, 2 jari untuk zoom</Text>
        </Animated.View>
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

        <TouchableOpacity
          style={styles.addTextTopButton}
          onPress={() => setShowTextModal(true)}
          disabled={isUploading}
        >
          <Ionicons name="text" size={24} color="#FFFFFF" />
          <Text style={styles.addTextTopLabel}>Teks</Text>
        </TouchableOpacity>
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
              <TouchableOpacity onPress={() => setShowTextModal(false)}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Tambah Teks</Text>
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
    </View>
  );
};

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
    maxWidth: 300,
  },
  textPreviewText: {
    textAlign: 'center',
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
  dragHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
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
    alignItems: 'center',
    marginBottom: 16,
  },
  previewText: {
    textAlign: 'center',
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
});

export default StoryEditorScreenSimple;
