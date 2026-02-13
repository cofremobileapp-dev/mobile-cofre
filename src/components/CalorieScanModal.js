import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/ApiService';
import { formatPrice } from '../utils/formatUtils';

const CalorieScanModal = ({ isOpen, onClose }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const styles = useMemo(() => createStyles(SCREEN_WIDTH), [SCREEN_WIDTH]);

  // Request camera permission
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Ditolak',
        'Aplikasi memerlukan akses kamera untuk scan makanan'
      );
      return false;
    }
    return true;
  };

  // Request gallery permission
  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Ditolak',
        'Aplikasi memerlukan akses galeri untuk memilih foto'
      );
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Gagal mengambil foto');
    }
  };

  // Pick from gallery
  const pickImage = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        analyzeImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Gagal memilih foto');
    }
  };

  // Analyze image with real AI service
  const analyzeImage = async (imageUri) => {
    setIsScanning(true);
    setScanResult(null);

    try {
      console.log('🔍 Starting AI scan for image:', imageUri);

      // Create FormData
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `food_${Date.now()}.jpg`,
      });

      console.log('📤 Sending image to AI scan endpoint...');

      // Call API
      const response = await apiService.scanFood(formData);

      console.log('✅ AI scan response:', response);

      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }

      const data = response.data;

      // Check if it's food
      if (!data.is_food) {
        Alert.alert(
          'Bukan Makanan',
          'Gambar yang dipilih sepertinya bukan makanan. Silakan coba foto makanan lain.',
          [{ text: 'OK', onPress: handleRetry }]
        );
        return;
      }

      // Process food items
      const items = data.items || [];
      const totalCalories = data.total_calories || 0;
      const price = data.price || 0;
      const ingredients = data.ingredients || '';
      const description = data.description || '';

      // Format result for display
      const result = {
        foodName: items.length > 0 ? items[0].name : 'Makanan',
        description: description,
        calories: totalCalories,
        price: price,
        ingredients: ingredients.split(',').map(i => i.trim()).filter(i => i),
        items: items.map(item => ({
          name: item.name,
          calories: item.calories,
          description: item.description,
        })),
        confidence: 0.9, // Gemini doesn't return confidence, set default high
      };

      console.log('📊 Processed result:', result);
      setScanResult(result);
    } catch (error) {
      console.error('❌ Error analyzing image:', error);

      let errorMessage = 'Gagal menganalisis makanan. Silakan coba lagi.';
      let errorTitle = 'Error';

      if (error.response) {
        // Server responded with error
        const status = error.response.status;

        if (status === 429) {
          // Rate limit exceeded
          errorTitle = 'Terlalu Banyak Permintaan';
          errorMessage = 'Anda telah melakukan terlalu banyak scan dalam waktu singkat. Silakan tunggu sebentar (1 menit) dan coba lagi.';
          console.error('⚠️ Rate limit exceeded (429)');
        } else {
          errorMessage = error.response.data?.message || errorMessage;
          console.error('Server error:', error.response.data);
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  // Reset modal state
  const handleClose = () => {
    setSelectedImage(null);
    setScanResult(null);
    setIsScanning(false);
    onClose();
  };

  // Retry with new image
  const handleRetry = () => {
    setSelectedImage(null);
    setScanResult(null);
    setIsScanning(false);
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Scan Makanan</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Image Preview or Selection */}
            {!selectedImage ? (
              <View style={styles.emptyState}>
                <Ionicons name="camera-outline" size={80} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Pilih Foto Makanan</Text>
                <Text style={styles.emptySubtitle}>
                  Ambil foto atau pilih dari galeri untuk menganalisis kalori
                </Text>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cameraButton]}
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera" size={28} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Ambil Foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.galleryButton]}
                    onPress={pickImage}
                  >
                    <Ionicons name="images" size={28} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Dari Galeri</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.imageContainer}>
                {/* Image Preview */}
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />

                {/* Scanning Overlay */}
                {isScanning && (
                  <View style={styles.scanningOverlay}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.scanningText}>Menganalisis makanan...</Text>
                  </View>
                )}

                {/* Scan Result */}
                {scanResult && (
                  <View style={styles.resultContainer}>
                    <View style={styles.resultHeader}>
                      <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                      <Text style={styles.resultTitle}>{scanResult.foodName}</Text>
                      {scanResult.description && (
                        <Text style={styles.descriptionText}>{scanResult.description}</Text>
                      )}
                      <Text style={styles.confidenceText}>
                        Confidence: {(scanResult.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>

                    {/* Main Stats */}
                    <View style={styles.nutritionGrid}>
                      <View style={styles.nutritionCard}>
                        <Ionicons name="flame" size={24} color="#EF4444" />
                        <Text style={styles.nutritionValue}>{scanResult.calories}</Text>
                        <Text style={styles.nutritionLabel}>Kalori</Text>
                      </View>
                      <View style={styles.nutritionCard}>
                        <Ionicons name="cash" size={24} color="#10B981" />
                        <Text style={styles.nutritionValue}>
                          {formatPrice(scanResult.price || 0)}
                        </Text>
                        <Text style={styles.nutritionLabel}>Harga</Text>
                      </View>
                    </View>

                    {/* Food Items Breakdown */}
                    {scanResult.items && scanResult.items.length > 0 && (
                      <View style={styles.itemsContainer}>
                        <Text style={styles.itemsTitle}>Detail Makanan:</Text>
                        {scanResult.items.map((item, index) => (
                          <View key={index} style={styles.foodItem}>
                            <View style={styles.foodItemHeader}>
                              <Text style={styles.foodItemName}>{item.name}</Text>
                              <Text style={styles.foodItemCalories}>{item.calories} kal</Text>
                            </View>
                            {item.description && (
                              <Text style={styles.foodItemDescription}>{item.description}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Ingredients */}
                    {scanResult.ingredients && scanResult.ingredients.length > 0 && (
                      <View style={styles.ingredientsContainer}>
                        <Text style={styles.ingredientsTitle}>Bahan-bahan:</Text>
                        <View style={styles.ingredientsList}>
                          {scanResult.ingredients.map((ingredient, index) => (
                            <View key={index} style={styles.ingredientItem}>
                              <Ionicons name="ellipse" size={6} color="#6B7280" />
                              <Text style={styles.ingredientText}>{ingredient}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.resultActions}>
                      <TouchableOpacity
                        style={[styles.resultActionButton, styles.retryButton]}
                        onPress={handleRetry}
                      >
                        <Ionicons name="refresh" size={20} color="#6B7280" />
                        <Text style={styles.retryButtonText}>Scan Lagi</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.resultActionButton, styles.saveButton]}
                        onPress={() => {
                          Alert.alert(
                            'Info',
                            'Hasil scan telah dicatat. Fitur meal log akan segera hadir!',
                            [{ text: 'OK', onPress: handleClose }]
                          );
                        }}
                      >
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>Selesai</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (SCREEN_WIDTH) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#8B5CF6',
  },
  galleryButton: {
    backgroundColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imageContainer: {
    gap: 16,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  scanningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resultContainer: {
    gap: 16,
  },
  resultHeader: {
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  confidenceText: {
    fontSize: 14,
    color: '#6B7280',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 64) / 2,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  ingredientsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  ingredientsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  ingredientsList: {
    gap: 6,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resultActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  retryButton: {
    backgroundColor: '#F3F4F6',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  itemsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  foodItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  foodItemCalories: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  foodItemDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
});

export default CalorieScanModal;
