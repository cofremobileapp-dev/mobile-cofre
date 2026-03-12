import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Modal,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import useStories from '../../hooks/useStories';

const StoryPreviewScreen = ({ route, navigation }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const { mediaUri, mediaType, textElements: initialTextElements } = route.params;
  const { uploadStory } = useStories();

  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Text Editor States - Initialize with passed textElements from editor
  const [textElements, setTextElements] = useState(initialTextElements || []);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentTextColor, setCurrentTextColor] = useState('#FFFFFF');
  const [currentTextAlign, setCurrentTextAlign] = useState('center');
  const [currentTextStyle, setCurrentTextStyle] = useState('bold');
  const [currentBackgroundColor, setCurrentBackgroundColor] = useState('transparent');
  const [editingTextId, setEditingTextId] = useState(null);

  // Available colors for text
  const textColors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

  // Available background colors (including transparent)
  const backgroundColors = ['transparent', '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'];

  // Text styles
  const textStyles = [
    { id: 'normal', label: 'Aa', fontWeight: 'normal' },
    { id: 'bold', label: 'Aa', fontWeight: 'bold' },
    { id: 'italic', label: 'Aa', fontStyle: 'italic' },
  ];

  const styles = useMemo(() => createStyles(SCREEN_WIDTH, SCREEN_HEIGHT), [SCREEN_WIDTH, SCREEN_HEIGHT]);

  // Open text editor
  const openTextEditor = () => {
    setShowTextEditor(true);
    setCurrentText('');
    setCurrentTextColor('#FFFFFF');
    setCurrentTextAlign('center');
    setCurrentTextStyle('bold');
    setCurrentBackgroundColor('transparent');
    setEditingTextId(null);
  };

  // Add or update text element
  const addTextElement = () => {
    if (!currentText.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    if (editingTextId) {
      // Update existing text element
      setTextElements(prev =>
        prev.map(el =>
          el.id === editingTextId
            ? {
                ...el,
                text: currentText,
                color: currentTextColor,
                align: currentTextAlign,
                style: currentTextStyle,
                backgroundColor: currentBackgroundColor,
              }
            : el
        )
      );
    } else {
      // Add new text element
      const newElement = {
        id: Date.now().toString(),
        text: currentText,
        color: currentTextColor,
        align: currentTextAlign,
        style: currentTextStyle,
        backgroundColor: currentBackgroundColor,
        x: SCREEN_WIDTH / 2 - 100,
        y: SCREEN_HEIGHT / 2 - 50,
        rotation: 0,
        scale: 1,
      };
      setTextElements(prev => [...prev, newElement]);
    }

    setShowTextEditor(false);
    setCurrentText('');
  };

  // Edit existing text element
  const editTextElement = (element) => {
    setEditingTextId(element.id);
    setCurrentText(element.text);
    setCurrentTextColor(element.color);
    setCurrentTextAlign(element.align);
    setCurrentTextStyle(element.style);
    setCurrentBackgroundColor(element.backgroundColor);
    setShowTextEditor(true);
  };

  // Delete text element
  const deleteTextElement = (id) => {
    setTextElements(prev => prev.filter(el => el.id !== id));
  };

  // Handle post with text elements
  const handlePost = async () => {
    try {
      setIsUploading(true);

      // Prepare text elements data - normalize positions to percentage for consistent display
      const textElementsData = textElements.map(el => ({
        text: el.text,
        color: el.color,
        align: el.align || 'center',
        style: el.style || 'normal',
        backgroundColor: el.backgroundColor || 'transparent',
        // Store as percentage of screen for consistent display across devices
        x: el.x,
        y: el.y,
        // Convert screen coordinates to center-based for viewer
        xPercent: (el.x / SCREEN_WIDTH) * 100,
        yPercent: (el.y / SCREEN_HEIGHT) * 100,
        rotation: el.rotation || 0,
        scale: el.scale || 1,
        size: el.size || 24,
      }));

      console.log('📤 [StoryPreview] Uploading story with text elements:', JSON.stringify(textElementsData));

      await uploadStory(mediaUri, mediaType, {
        caption: caption.trim() || null,
        duration: mediaType === 'video' ? 15 : 5,
        text_elements: textElementsData.length > 0 ? JSON.stringify(textElementsData) : null,
      });

      Alert.alert('Berhasil', 'Story berhasil diposting!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.popToTop();
          },
        },
      ]);
    } catch (error) {
      console.error('❌ [StoryPreview] Error posting story:', error);
      console.error('❌ [StoryPreview] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // More specific error messages
      let errorMessage = 'Gagal memposting story. Silakan coba lagi.';
      if (error.response?.status === 413) {
        errorMessage = 'File terlalu besar. Maksimal 50MB untuk video.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
      } else if (error.response?.status === 422) {
        errorMessage = error.response?.data?.message || 'Format file tidak valid.';
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        errorMessage = 'Koneksi timeout. Periksa koneksi internet Anda.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Draggable Text Component
  const DraggableText = ({ element }) => {
    const pan = useRef(new Animated.ValueXY({ x: element.x, y: element.y })).current;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.setOffset({
            x: pan.x._value,
            y: pan.y._value
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: (_, gesture) => {
          pan.flattenOffset();
          // Update element position
          setTextElements(prev =>
            prev.map(el =>
              el.id === element.id
                ? { ...el, x: pan.x._value, y: pan.y._value }
                : el
            )
          );
        },
      })
    ).current;

    const textStyleObj = {
      color: element.color,
      textAlign: element.align,
      fontWeight: element.style === 'bold' ? 'bold' : 'normal',
      fontStyle: element.style === 'italic' ? 'italic' : 'normal',
      backgroundColor: element.backgroundColor,
    };

    return (
      <Animated.View
        style={[
          styles.draggableText,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.textElementContainer}>
          <Text style={[styles.textElement, textStyleObj]}>
            {element.text}
          </Text>
          <View style={styles.textElementActions}>
            <TouchableOpacity
              style={styles.textActionButton}
              onPress={() => editTextElement(element)}
            >
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.textActionButton}
              onPress={() => deleteTextElement(element.id)}
            >
              <Ionicons name="trash" size={16} color="#FF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Media Preview */}
      <View style={styles.mediaContainer}>
        {mediaType === 'image' ? (
          <Image source={{ uri: mediaUri }} style={styles.media} resizeMode="contain" />
        ) : (
          <Video
            source={{ uri: mediaUri }}
            style={styles.media}
            resizeMode="contain"
            shouldPlay
            isLooping
            isMuted={false}
          />
        )}

        {/* Render text elements on top of media */}
        {textElements.map(element => (
          <DraggableText key={element.id} element={element} />
        ))}
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          disabled={isUploading}
        >
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Add Text Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={openTextEditor}
          disabled={isUploading}
        >
          <MaterialCommunityIcons name="format-text" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {/* Caption Input */}
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            value={caption}
            onChangeText={setCaption}
            maxLength={500}
            multiline
            editable={!isUploading}
          />
        </View>

        {/* Add Another Story Button */}
        <TouchableOpacity
          style={[styles.addStoryButton, isUploading && styles.addStoryButtonDisabled]}
          onPress={() => {
            Alert.alert(
              'Add Another Story',
              'Save this story and add another one?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add Another',
                  onPress: async () => {
                    // Upload current story first
                    await handlePost();
                    // Navigate back to camera to add another
                    navigation.navigate('StoryCamera');
                  }
                }
              ]
            );
          }}
          disabled={isUploading}
        >
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.addStoryButtonText}>+</Text>
        </TouchableOpacity>

        {/* Post Button */}
        <TouchableOpacity
          style={[styles.postButton, isUploading && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.postButtonText}>Post</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.uploadText}>Uploading your story...</Text>
          </View>
        </View>
      )}

      {/* Text Editor Modal */}
      <Modal
        visible={showTextEditor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTextEditor(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTextEditor(false)}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTextId ? 'Edit Text' : 'Add Text'}
              </Text>
              <TouchableOpacity onPress={addTextElement}>
                <Ionicons name="checkmark" size={28} color="#10B981" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Text Input */}
              <View style={styles.editorSection}>
                <Text style={styles.sectionLabel}>Text</Text>
                <TextInput
                  style={styles.textEditorInput}
                  placeholder="Enter your text..."
                  placeholderTextColor="#9CA3AF"
                  value={currentText}
                  onChangeText={setCurrentText}
                  maxLength={200}
                  multiline
                  autoFocus
                />
                <Text style={styles.characterCount}>{currentText.length}/200</Text>
              </View>

              {/* Text Preview */}
              <View style={styles.editorSection}>
                <Text style={styles.sectionLabel}>Preview</Text>
                <View style={styles.textPreview}>
                  <Text
                    style={[
                      styles.previewText,
                      {
                        color: currentTextColor,
                        textAlign: currentTextAlign,
                        fontWeight: currentTextStyle === 'bold' ? 'bold' : 'normal',
                        fontStyle: currentTextStyle === 'italic' ? 'italic' : 'normal',
                        backgroundColor: currentBackgroundColor,
                      },
                    ]}
                  >
                    {currentText || 'Your text here'}
                  </Text>
                </View>
              </View>

              {/* Text Color */}
              <View style={styles.editorSection}>
                <Text style={styles.sectionLabel}>Text Color</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.colorPicker}>
                    {textColors.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          currentTextColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => setCurrentTextColor(color)}
                      >
                        {currentTextColor === color && (
                          <Ionicons name="checkmark" size={20} color={color === '#FFFFFF' ? '#000000' : '#FFFFFF'} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Background Color */}
              <View style={styles.editorSection}>
                <Text style={styles.sectionLabel}>Background</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.colorPicker}>
                    {backgroundColors.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          {
                            backgroundColor: color === 'transparent' ? '#FFFFFF' : color,
                            borderWidth: color === 'transparent' ? 2 : 0,
                            borderColor: '#E5E7EB',
                          },
                          currentBackgroundColor === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => setCurrentBackgroundColor(color)}
                      >
                        {color === 'transparent' && (
                          <Ionicons name="close" size={20} color="#EF4444" />
                        )}
                        {currentBackgroundColor === color && color !== 'transparent' && (
                          <Ionicons name="checkmark" size={20} color={color === '#FFFFFF' ? '#000000' : '#FFFFFF'} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Text Alignment */}
              <View style={styles.editorSection}>
                <Text style={styles.sectionLabel}>Alignment</Text>
                <View style={styles.alignmentPicker}>
                  {['left', 'center', 'right'].map(align => (
                    <TouchableOpacity
                      key={align}
                      style={[
                        styles.alignmentOption,
                        currentTextAlign === align && styles.alignmentOptionSelected,
                      ]}
                      onPress={() => setCurrentTextAlign(align)}
                    >
                      <Ionicons
                        name={
                          align === 'left' ? 'text-outline' :
                          align === 'center' ? 'text' :
                          'text-outline'
                        }
                        size={24}
                        color={currentTextAlign === align ? '#FFFFFF' : '#1F2937'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Text Style */}
              <View style={styles.editorSection}>
                <Text style={styles.sectionLabel}>Style</Text>
                <View style={styles.stylePicker}>
                  {textStyles.map(styleOption => (
                    <TouchableOpacity
                      key={styleOption.id}
                      style={[
                        styles.styleOption,
                        currentTextStyle === styleOption.id && styles.styleOptionSelected,
                      ]}
                      onPress={() => setCurrentTextStyle(styleOption.id)}
                    >
                      <Text
                        style={[
                          styles.styleOptionText,
                          {
                            fontWeight: styleOption.fontWeight,
                            fontStyle: styleOption.fontStyle,
                          },
                          currentTextStyle === styleOption.id && styles.styleOptionTextSelected,
                        ]}
                      >
                        {styleOption.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (SCREEN_WIDTH, SCREEN_HEIGHT) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    gap: 12,
  },
  captionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  captionInput: {
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
  },
  addStoryButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 8,
  },
  addStoryButtonDisabled: {
    backgroundColor: '#6B7280',
    opacity: 0.5,
  },
  addStoryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  postButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
  },
  postButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  // Text Editor Styles
  draggableText: {
    position: 'absolute',
  },
  textElementContainer: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  textElement: {
    fontSize: 24,
    minWidth: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  textElementActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  textActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  editorSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  textEditorInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 8,
  },
  textPreview: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#10B981',
  },
  alignmentPicker: {
    flexDirection: 'row',
    gap: 12,
  },
  alignmentOption: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignmentOptionSelected: {
    backgroundColor: '#10B981',
  },
  stylePicker: {
    flexDirection: 'row',
    gap: 12,
  },
  styleOption: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleOptionSelected: {
    backgroundColor: '#10B981',
  },
  styleOptionText: {
    fontSize: 24,
    color: '#1F2937',
  },
  styleOptionTextSelected: {
    color: '#FFFFFF',
  },
});

export default StoryPreviewScreen;
