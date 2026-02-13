import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';

const EditVideoScreen = ({ navigation, route }) => {
  const { videoId, videoData } = route.params;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Parse menu_data from videoData
  const getMenuData = () => {
    if (!videoData) return {};

    // menu_data could be string or object
    if (videoData.menu_data) {
      if (typeof videoData.menu_data === 'string') {
        try {
          return JSON.parse(videoData.menu_data);
        } catch (e) {
          return {};
        }
      }
      return videoData.menu_data;
    }
    return {};
  };

  const menuData = getMenuData();

  // Form fields - extract from menu_data
  const [menuName, setMenuName] = useState(menuData?.menu_name || '');
  const [description, setDescription] = useState(menuData?.description || '');
  const [price, setPrice] = useState(menuData?.price?.toString() || '');
  const [category, setCategory] = useState(menuData?.category || '');
  const [cookingTime, setCookingTime] = useState(menuData?.cooking_time?.toString() || '');
  const [servings, setServings] = useState(menuData?.servings?.toString() || '');
  const [difficulty, setDifficulty] = useState(menuData?.difficulty || 'medium');
  const [ingredients, setIngredients] = useState(
    Array.isArray(menuData?.ingredients) ? menuData.ingredients.join('\n') : ''
  );
  const [steps, setSteps] = useState(
    Array.isArray(menuData?.steps) ? menuData.steps.join('\n') : ''
  );

  const handleSave = async () => {
    if (!menuName.trim()) {
      Alert.alert('Error', 'Nama menu tidak boleh kosong');
      return;
    }

    try {
      setSaving(true);

      // Parse ingredients and steps from text to array
      const ingredientsArray = ingredients
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      const stepsArray = steps
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      const data = {
        menu_name: menuName.trim(),
        description: description.trim(),
        price: price ? parseFloat(price) : null,
        category: category.trim(),
        cooking_time: cookingTime ? parseInt(cookingTime) : null,
        servings: servings ? parseInt(servings) : null,
        difficulty: difficulty,
        ingredients: ingredientsArray,
        steps: stepsArray,
      };

      const response = await apiService.updateVideo(videoId, data);

      if (response.data?.success) {
        Alert.alert('Berhasil', 'Video berhasil diperbarui', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error(response.data?.message || 'Gagal memperbarui video');
      }
    } catch (error) {
      console.error('Error updating video:', error);
      Alert.alert('Error', error.message || 'Gagal memperbarui video');
    } finally {
      setSaving(false);
    }
  };

  const difficultyOptions = [
    { value: 'easy', label: 'Mudah' },
    { value: 'medium', label: 'Sedang' },
    { value: 'hard', label: 'Sulit' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Postingan</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Text style={styles.saveButtonText}>Simpan</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Menu Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Menu *</Text>
            <TextInput
              style={styles.input}
              value={menuName}
              onChangeText={setMenuName}
              placeholder="Contoh: Nasi Goreng Spesial"
              placeholderTextColor="#9CA3AF"
              maxLength={255}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Deskripsi</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ceritakan tentang menu ini..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Harga (Rp)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Contoh: 25000"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kategori</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Contoh: Makanan Berat"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          {/* Ingredients */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bahan-bahan (satu per baris)</Text>
            <TextInput
              style={[styles.input, styles.textAreaLarge]}
              value={ingredients}
              onChangeText={setIngredients}
              placeholder="Contoh:&#10;2 butir telur&#10;200g nasi&#10;2 siung bawang putih"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
            />
          </View>

          {/* Steps */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Langkah-langkah (satu per baris)</Text>
            <TextInput
              style={[styles.input, styles.textAreaLarge]}
              value={steps}
              onChangeText={setSteps}
              placeholder="Contoh:&#10;Panaskan minyak&#10;Tumis bawang putih&#10;Masukkan nasi"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
            />
          </View>

          {/* Cooking Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Waktu Memasak (menit)</Text>
            <TextInput
              style={styles.input}
              value={cookingTime}
              onChangeText={setCookingTime}
              placeholder="Contoh: 30"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Servings */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Porsi</Text>
            <TextInput
              style={styles.input}
              value={servings}
              onChangeText={setServings}
              placeholder="Contoh: 4"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Difficulty */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tingkat Kesulitan</Text>
            <View style={styles.difficultyContainer}>
              {difficultyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.difficultyButton,
                    difficulty === option.value && styles.difficultyButtonActive,
                  ]}
                  onPress={() => setDifficulty(option.value)}
                >
                  <Text
                    style={[
                      styles.difficultyButtonText,
                      difficulty === option.value && styles.difficultyButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#10B981',
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  difficultyButtonTextActive: {
    color: '#FFFFFF',
  },
  spacer: {
    height: 40,
  },
});

export default EditVideoScreen;
