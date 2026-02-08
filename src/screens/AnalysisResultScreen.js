import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../utils/formatUtils';

const AnalysisResultScreen = ({ route }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { analysisData, imageUri, videoData } = route.params || {};

  const styles = useMemo(() => createStyles(SCREEN_WIDTH), [SCREEN_WIDTH]);

  // Parse analysis data
  const foodItems = analysisData?.items || [];
  const totalCalories = foodItems.reduce((sum, item) => sum + (item.calories || 0), 0);
  const estimatedPrice = analysisData?.price || 0;

  // Calculate estimated protein (rough estimate: ~10-15% of calories)
  const calculateProtein = (calories) => {
    return Math.round((calories * 0.12) / 4); // 12% of calories as protein, divided by 4 cal/g
  };

  // Estimate portion size based on calories
  const estimatePortion = (calories) => {
    if (calories < 100) return '30-50g';
    if (calories < 200) return '80-100g';
    if (calories < 400) return '150-200g';
    return '250-300g';
  };

  const handleScanAgain = () => {
    // Go back to camera/gallery picker
    navigation.goBack();
  };

  const handleDone = () => {
    // Navigate to upload screen with this data
    navigation.navigate('Upload', {
      analysisData,
      imageUri,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hasil Scan AI</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Food Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri || 'https://via.placeholder.com/400' }}
            style={styles.foodImage}
            resizeMode="cover"
          />

          {/* Total Calories Badge */}
          <View style={styles.totalCaloriesBadge}>
            <Text style={styles.totalCaloriesLabel}>Total Kalori</Text>
            <Text style={styles.totalCaloriesValue}>{totalCalories} kal</Text>
          </View>
        </View>

        {/* Ingredient Breakdown Section */}
        <View style={styles.breakdownSection}>
          <View style={styles.breakdownHeader}>
            <Ionicons name="nutrition-outline" size={24} color="#06402B" />
            <Text style={styles.breakdownTitle}>Ingredient Breakdown</Text>
          </View>

          {/* Price Info */}
          {estimatedPrice > 0 && (
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>Estimasi Harga:</Text>
              <Text style={styles.priceValue}>{formatPrice(estimatedPrice)}</Text>
            </View>
          )}

          {/* Table Header */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colIngredient]}>Ingredient</Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
              <Text style={[styles.tableHeaderText, styles.colCalories]}>Calories</Text>
              <Text style={[styles.tableHeaderText, styles.colProtein]}>Protein</Text>
            </View>

            {/* Table Rows */}
            {foodItems.map((item, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                <View style={styles.colIngredient}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.ingredientDesc}>{item.description}</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.colAmount]}>{estimatePortion(item.calories)}</Text>
                <Text style={[styles.tableCell, styles.colCalories]}>{item.calories} cal</Text>
                <Text style={[styles.tableCell, styles.colProtein]}>{calculateProtein(item.calories)}g</Text>
              </View>
            ))}

            {/* Total Row */}
            <View style={styles.tableTotalRow}>
              <Text style={[styles.tableTotalText, styles.colIngredient]}>TOTAL</Text>
              <Text style={[styles.tableTotalText, styles.colAmount]}>-</Text>
              <Text style={[styles.tableTotalText, styles.colCalories]}>{totalCalories} cal</Text>
              <Text style={[styles.tableTotalText, styles.colProtein]}>
                {foodItems.reduce((sum, item) => sum + calculateProtein(item.calories), 0)}g
              </Text>
            </View>
          </View>

          {/* Additional Info */}
          {analysisData?.description && (
            <View style={styles.additionalInfo}>
              <Text style={styles.additionalInfoLabel}>Deskripsi:</Text>
              <Text style={styles.additionalInfoText}>{analysisData.description}</Text>
            </View>
          )}

          {analysisData?.ingredients && (
            <View style={styles.additionalInfo}>
              <Text style={styles.additionalInfoLabel}>Bahan-bahan:</Text>
              <Text style={styles.additionalInfoText}>{analysisData.ingredients}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain}>
            <Ionicons name="camera-outline" size={20} color="#06402B" />
            <Text style={styles.scanAgainText}>Scan Lagi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneText}>Selesai</Text>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (SCREEN_WIDTH) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F5F1E8',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: '#E5E7EB',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  totalCaloriesBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#06402B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  totalCaloriesLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  totalCaloriesValue: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  breakdownSection: {
    backgroundColor: '#F5F1E8',
    padding: 20,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDE8D0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#06402B',
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#06402B',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowEven: {
    backgroundColor: '#FAFAF9',
  },
  tableCell: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  colIngredient: {
    flex: 2.5,
  },
  colAmount: {
    flex: 1.5,
    textAlign: 'center',
  },
  colCalories: {
    flex: 1.2,
    textAlign: 'center',
  },
  colProtein: {
    flex: 1,
    textAlign: 'center',
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  ingredientDesc: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  tableTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#EDE8D0',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: '#06402B',
  },
  tableTotalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06402B',
  },
  additionalInfo: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#06402B',
  },
  additionalInfoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06402B',
    marginBottom: 6,
  },
  additionalInfoText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    backgroundColor: '#F5F1E8',
  },
  scanAgainButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#06402B',
    gap: 8,
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06402B',
  },
  doneButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#06402B',
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AnalysisResultScreen;
