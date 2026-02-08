import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Animated,
  PanResponder,
  useWindowDimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CalorieScanModal from './CalorieScanModal';

const BUTTON_SIZE = 60;
const MARGIN = 20;

export const AIFloatingButton = () => {
  // ✅ Get dimensions safely using hook
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  // ✅ ALL HOOKS MUST BE AT THE TOP (before any returns)
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Default to visible
  const navigation = useNavigation();

  // Animation hooks - MUST be before conditional return
  const pan = useRef(new Animated.ValueXY({
    x: SCREEN_WIDTH - BUTTON_SIZE - MARGIN,
    y: SCREEN_HEIGHT - 200
  })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDragging = useRef(false);
  const dragThreshold = 5;

  // PanResponder for drag functionality - MUST be before conditional return
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only set responder if moved more than threshold
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },

      onPanResponderGrant: () => {
        isDragging.current = false;

        // Animate scale down (press feedback)
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          useNativeDriver: false,
        }).start();

        // Set offset for smooth dragging
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (_, gestureState) => {
        // Track drag distance
        const distance = Math.sqrt(
          gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy
        );

        if (distance > dragThreshold) {
          isDragging.current = true;
        }

        // Update position
        Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        )(_, gestureState);
      },

      onPanResponderRelease: () => {
        // Flatten offset
        pan.flattenOffset();

        // Animate scale back to normal
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false,
        }).start();

        // Get final position
        let finalX = pan.x._value;
        let finalY = pan.y._value;

        // Boundary checking with margin
        const minX = MARGIN;
        const maxX = SCREEN_WIDTH - BUTTON_SIZE - MARGIN;
        const minY = MARGIN;
        const maxY = SCREEN_HEIGHT - BUTTON_SIZE - MARGIN;

        // Snap to nearest edge (left or right)
        if (finalX < SCREEN_WIDTH / 2) {
          finalX = minX;
        } else {
          finalX = maxX;
        }

        // Clamp Y position
        finalY = Math.max(minY, Math.min(maxY, finalY));

        // Animate to final position
        Animated.spring(pan, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();

        // Handle click vs drag
        // If not dragging, open scan modal directly
        if (!isDragging.current) {
          handleButtonPress();
        }
      },
    })
  ).current;

  // Listen to navigation changes to determine visibility
  useEffect(() => {
    const updateVisibility = () => {
      try {
        const state = navigation.getState();
        if (!state) {
          setIsVisible(true);
          return;
        }

        let currentRoute = state.routes[state.index];
        while (currentRoute.state) {
          currentRoute = currentRoute.state.routes[currentRoute.state.index];
        }

        const routeName = currentRoute.name;
        const shouldShow = routeName === 'HomeMain' || routeName === 'Home';
        setIsVisible(shouldShow);
      } catch (error) {
        console.log('Error checking route, defaulting to visible:', error.message);
        setIsVisible(true);
      }
    };

    updateVisibility();
    const unsubscribe = navigation.addListener('state', updateVisibility);
    return unsubscribe;
  }, [navigation]);

  // ✅ NOW safe to return early - all hooks already called
  if (!isVisible) {
    return null;
  }

  // Handle button press - Open scan modal directly
  const handleButtonPress = () => {
    console.log('🎯 AI Button pressed - Opening scan modal');
    setIsScanOpen(true);
  };

  return (
    <>
      {/* Main Floating Button */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.mainButton}>
          <Ionicons
            name="sparkles"
            size={28}
            color="#FFFFFF"
          />
        </View>
      </Animated.View>

      {/* Calorie Scan Modal */}
      <CalorieScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999, // For Android
  },
  mainButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#10B981', // Green color for food scanning
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default AIFloatingButton;
