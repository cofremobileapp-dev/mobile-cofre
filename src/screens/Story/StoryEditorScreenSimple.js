import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Alert,
  TextInput,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';

const StoryEditorScreenSimple = ({ route }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const navigation = useNavigation();
  const { mediaUri, mediaType } = route.params;

  // Text states only (drawing removed untuk Expo Go compatibility)
  const [textInput, setTextInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [textStyle, setTextStyle] = useState('classic');
  const [textSize, setTextSize] = useState(24);
  const [textElements, setTextElements] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Text styles
  const textStyles = [
    { id: 'classic', label: 'Classic', fontFamily: 'System' },
    { id: 'typewriter', label: 'Typewriter', fontFamily: 'Courier' },
    { id: 'neon', label: 'Neon', fontFamily: 'System', glow: true },
    { id: 'strong', label: 'Si', fontWeight: 'bold' },
  ];

  // Color palette
  const colors = [
    '#FFFFFF', // White
    '#000000', // Black
    '#FF3B5C', // Red
    '#3B82F6', // Blue
    '#FBBF24', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#10B981', // Green
    '#FF9500', // Orange
    '#00D4FF', // Cyan
  ];

  // Add text element - position at CENTER of visible area (above toolbar)
  const handleAddText = () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    // Calculate center position - account for top bar (90px) and bottom toolbar (50% max)
    // Visible area is roughly from y=100 to y=SCREEN_HEIGHT*0.5
    const visibleTop = 100;
    const visibleBottom = SCREEN_HEIGHT * 0.5;
    const centerY = (visibleTop + visibleBottom) / 2;
    const centerX = SCREEN_WIDTH / 2;

    const newTextElement = {
      id: Date.now().toString(),
      text: textInput,
      color: selectedColor,
      style: textStyle,
      size: textSize,
      x: centerX,
      y: centerY,
    };

    console.log('📝 [StoryEditor] Adding text at position:', { x: centerX, y: centerY });
    setTextElements([...textElements, newTextElement]);
    setTextInput('');
  };

  // Draggable Text Component
  const DraggableTextElement = ({ element, onDelete, onUpdatePosition }) => {
    const pan = useRef(new Animated.ValueXY({ x: element.x, y: element.y })).current;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setIsDragging(true);
          pan.setOffset({
            x: pan.x._value,
            y: pan.y._value,
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: () => {
          pan.flattenOffset();
          setIsDragging(false);
          // Update element position
          onUpdatePosition(element.id, pan.x._value, pan.y._value);
        },
      })
    ).current;

    const textStyleProps = getTextStyleProps(element.style);

    return (
      <Animated.View
        style={[
          styles.draggableTextWrapper,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.textElementBox}>
          <Text
            style={[
              styles.textElementText,
              {
                color: element.color,
                fontSize: element.size,
                ...textStyleProps,
              },
            ]}
          >
            {element.text}
          </Text>
          <TouchableOpacity
            style={styles.deleteTextButton}
            onPress={() => onDelete(element.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={24} color="#FF3B5C" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Update text element position
  const updateTextPosition = (id, x, y) => {
    setTextElements(prev =>
      prev.map(el =>
        el.id === id ? { ...el, x, y } : el
      )
    );
  };

  // Delete text element
  const handleDeleteText = (id) => {
    setTextElements(textElements.filter(el => el.id !== id));
  };

  // Get text style properties
  const getTextStyleProps = (style) => {
    const styleConfig = textStyles.find(s => s.id === style);
    if (!styleConfig) return {};

    const props = {
      fontWeight: styleConfig.fontWeight || 'normal',
    };

    if (styleConfig.glow) {
      props.textShadowColor = selectedColor;
      props.textShadowOffset = { width: 0, height: 0 };
      props.textShadowRadius = 10;
    }

    if (styleConfig.fontFamily === 'Courier') {
      props.fontFamily = 'Courier';
    }

    return props;
  };

  // Proceed to preview
  const handleDone = () => {
    navigation.navigate('StoryPreview', {
      mediaUri,
      mediaType,
      textElements: textElements.length > 0 ? textElements : undefined,
    });
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

      {/* Text Elements Overlay - Draggable */}
      <View style={styles.textElementsContainer} pointerEvents="box-none">
        {textElements.map((element) => (
          <DraggableTextElement
            key={element.id}
            element={element}
            onDelete={handleDeleteText}
            onUpdatePosition={updateTextPosition}
          />
        ))}
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.topTitle}>Text Editor</Text>

        <View style={{ width: 44 }} />
      </View>

      {/* Bottom Toolbar */}
      <View style={styles.bottomToolbar}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Color Palette */}
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

          {/* Text Input */}
          <TextInput
            style={styles.textInput}
            placeholder="Ketik sesuatu..."
            placeholderTextColor="#9CA3AF"
            value={textInput}
            onChangeText={setTextInput}
            maxLength={100}
            multiline={false}
          />

          {/* Text Styles */}
          <View style={styles.textStylesContainer}>
            {textStyles.map((style) => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.textStyleButton,
                  textStyle === style.id && styles.textStyleButtonSelected,
                ]}
                onPress={() => setTextStyle(style.id)}
              >
                <Text style={[
                  styles.textStyleLabel,
                  textStyle === style.id && styles.textStyleLabelSelected,
                ]}>
                  {style.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Size Slider */}
          <View style={styles.sizeSliderContainer}>
            <Text style={styles.sizeLabel}>Size: {Math.round(textSize)}px</Text>
            <Slider
              style={styles.sizeSlider}
              minimumValue={12}
              maximumValue={48}
              step={1}
              value={textSize}
              onValueChange={setTextSize}
              minimumTrackTintColor="#10B981"
              maximumTrackTintColor="#FFFFFF50"
              thumbTintColor="#10B981"
            />
          </View>

          {/* Add Text Button */}
          <TouchableOpacity style={styles.addTextButton} onPress={handleAddText}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addTextButtonText}>Add Text</Text>
          </TouchableOpacity>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </ScrollView>
      </View>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  iconButton: {
    padding: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingBottom: 20,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },
  textElementsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  draggableTextWrapper: {
    position: 'absolute',
    zIndex: 101,
  },
  textElementBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    minWidth: 80,
    alignItems: 'center',
  },
  textElementWrapper: {
    position: 'absolute',
    padding: 8,
  },
  textElementText: {
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  deleteTextButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  textInput: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#374151',
  },
  textStylesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  textStyleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  textStyleButtonSelected: {
    backgroundColor: '#10B981',
  },
  textStyleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  textStyleLabelSelected: {
    color: '#FFFFFF',
  },
  sizeSliderContainer: {
    paddingHorizontal: 8,
  },
  sizeLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  sizeSlider: {
    width: '100%',
    height: 40,
  },
  addTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  addTextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StoryEditorScreenSimple;
