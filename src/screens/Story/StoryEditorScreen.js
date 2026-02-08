import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  TextInput,
  Slider,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Canvas, Path, Skia, useCanvasRef } from '@shopify/react-native-skia';
import { useNavigation } from '@react-navigation/native';

const StoryEditorScreen = ({ route }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const navigation = useNavigation();
  const { mediaUri, mediaType } = route.params;

  const canvasRef = useCanvasRef();
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [selectedTool, setSelectedTool] = useState('marker');
  const [selectedColor, setSelectedColor] = useState('#10B981');
  const [strokeWidth, setStrokeWidth] = useState(5);

  // Text mode states
  const [mode, setMode] = useState('draw'); // 'draw' or 'text'
  const [textInput, setTextInput] = useState('');
  const [textStyle, setTextStyle] = useState('classic');
  const [textSize, setTextSize] = useState(24);
  const [textElements, setTextElements] = useState([]);

  // Drawing tools configuration
  const tools = [
    { id: 'marker', label: 'Marker', icon: 'create-outline', width: 5 },
    { id: 'brush', label: 'Brush', icon: 'brush-outline', width: 10 },
    { id: 'neon', label: 'Neon', icon: 'flash-outline', width: 8 },
    { id: 'eraser', label: 'Eraser', icon: 'remove-outline', width: 20 },
  ];

  // Text styles
  const textStyles = [
    { id: 'classic', label: 'Classic', fontFamily: 'System' },
    { id: 'typewriter', label: 'Typewriter', fontFamily: 'Courier' },
    { id: 'neon', label: 'Neon', fontFamily: 'System', glow: true },
    { id: 'strong', label: 'Si', fontWeight: 'bold' },
  ];

  // Color palette
  const colors = [
    '#FFFFFF', // White (better for text default)
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

  // Handle touch start
  const handleTouchStart = (e) => {
    const { locationX, locationY } = e.nativeEvent;

    const path = Skia.Path.Make();
    path.moveTo(locationX, locationY);

    setCurrentPath({
      path,
      color: selectedTool === 'eraser' ? '#00000000' : selectedColor,
      strokeWidth: tools.find(t => t.id === selectedTool)?.width || strokeWidth,
      tool: selectedTool,
    });
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!currentPath) return;

    const { locationX, locationY } = e.nativeEvent;
    currentPath.path.lineTo(locationX, locationY);

    // Force re-render by creating new object
    setCurrentPath({ ...currentPath });
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (currentPath) {
      setPaths([...paths, currentPath]);
      setCurrentPath(null);
    }
  };

  // Undo last drawing
  const handleUndo = () => {
    if (paths.length > 0) {
      setPaths(paths.slice(0, -1));
    }
  };

  // Clear all drawings
  const handleClear = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all drawings?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setPaths([])
        },
      ]
    );
  };

  // Select tool
  const handleSelectTool = (toolId) => {
    setSelectedTool(toolId);
    const tool = tools.find(t => t.id === toolId);
    if (tool) {
      setStrokeWidth(tool.width);
    }
  };

  // Toggle between draw and text mode
  const toggleMode = () => {
    setMode(mode === 'draw' ? 'text' : 'draw');
  };

  // Add text to canvas
  const handleAddText = () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    const newTextElement = {
      id: Date.now().toString(),
      text: textInput,
      color: selectedColor,
      style: textStyle,
      size: textSize,
      x: SCREEN_WIDTH / 2,
      y: SCREEN_HEIGHT / 3,
    };

    setTextElements([...textElements, newTextElement]);
    setTextInput('');
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

      {/* Drawing Canvas Overlay */}
      {mode === 'draw' && (
        <View style={styles.canvasContainer}>
          <Canvas
            ref={canvasRef}
            style={styles.canvas}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Render all completed paths */}
            {paths.map((pathData, index) => (
              <Path
                key={index}
                path={pathData.path}
                color={pathData.color}
                style="stroke"
                strokeWidth={pathData.strokeWidth}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}

            {/* Render current drawing path */}
            {currentPath && (
              <Path
                path={currentPath.path}
                color={currentPath.color}
                style="stroke"
                strokeWidth={currentPath.strokeWidth}
                strokeCap="round"
                strokeJoin="round"
              />
            )}
          </Canvas>
        </View>
      )}

      {/* Text Elements Overlay */}
      <View style={styles.textElementsContainer} pointerEvents={mode === 'text' ? 'auto' : 'none'}>
        {textElements.map((element) => (
          <View
            key={element.id}
            style={[
              styles.textElementWrapper,
              {
                left: element.x - 100,
                top: element.y - 30,
              },
            ]}
          >
            <Text
              style={[
                styles.textElementText,
                {
                  color: element.color,
                  fontSize: element.size,
                  ...getTextStyleProps(element.style),
                },
              ]}
            >
              {element.text}
            </Text>
            {mode === 'text' && (
              <TouchableOpacity
                style={styles.deleteTextButton}
                onPress={() => handleDeleteText(element.id)}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B5C" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'draw' && styles.modeButtonActive]}
            onPress={() => setMode('draw')}
          >
            <Ionicons name="brush" size={20} color={mode === 'draw' ? '#10B981' : '#FFFFFF'} />
            <Text style={[styles.modeButtonText, mode === 'draw' && styles.modeButtonTextActive]}>
              Draw
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'text' && styles.modeButtonActive]}
            onPress={() => setMode('text')}
          >
            <Ionicons name="text" size={20} color={mode === 'text' ? '#10B981' : '#FFFFFF'} />
            <Text style={[styles.modeButtonText, mode === 'text' && styles.modeButtonTextActive]}>
              Text
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topActions}>
          {mode === 'draw' && (
            <>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleUndo}
                disabled={paths.length === 0}
              >
                <Ionicons
                  name="arrow-undo"
                  size={24}
                  color={paths.length === 0 ? '#FFFFFF50' : '#FFFFFF'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={handleClear}>
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Bottom Toolbar */}
      <View style={styles.bottomToolbar}>
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

        {/* Drawing Tools - Only in Draw Mode */}
        {mode === 'draw' && (
          <View style={styles.toolsContainer}>
            {tools.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={[
                  styles.toolButton,
                  selectedTool === tool.id && styles.toolButtonSelected,
                ]}
                onPress={() => handleSelectTool(tool.id)}
              >
                <Ionicons
                  name={tool.icon}
                  size={22}
                  color={selectedTool === tool.id ? '#FFFFFF' : '#1F2937'}
                />
                <Text style={[
                  styles.toolLabel,
                  selectedTool === tool.id && styles.toolLabelSelected,
                ]}>
                  {tool.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Text Mode Controls */}
        {mode === 'text' && (
          <>
            {/* Text Input - WYSIWYG with real-time preview */}
            <TextInput
              style={[
                styles.textInput,
                {
                  color: selectedColor,  // WYSIWYG: Real-time color preview
                  fontSize: textSize,    // WYSIWYG: Real-time size preview
                  ...getTextStyleProps(textStyle), // WYSIWYG: Real-time style preview
                }
              ]}
              placeholder="Ketik sesuatu..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={textInput}
              onChangeText={setTextInput}
              maxLength={200}
              multiline={true}        // FIX: Enable multiline support
              blurOnSubmit={false}    // FIX: Don't blur on Enter key
              numberOfLines={3}
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
          </>
        )}

        {/* Done Button */}
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </TouchableOpacity>
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
  canvasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  canvas: {
    flex: 1,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topCenter: {
    flexDirection: 'row',
    gap: 8,
  },
  topActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modeButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  modeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#10B981',
  },
  bottomToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingBottom: 40,
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  toolButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 4,
  },
  toolButtonSelected: {
    backgroundColor: '#10B981',
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  toolLabelSelected: {
    color: '#FFFFFF',
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
  textElementsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textElementWrapper: {
    position: 'absolute',
    padding: 8,
  },
  textElementText: {
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  deleteTextButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
});

export default StoryEditorScreen;
