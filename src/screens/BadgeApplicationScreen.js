import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

const BadgeApplicationScreen = ({ navigation }) => {
  const [reason, setReason] = useState('');
  const [isCulinaryCreator, setIsCulinaryCreator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshUser } = useAuth();

  const handleSubmit = async () => {
    // Validate reason length
    if (reason.trim().length < 50) {
      Alert.alert('Alasan Terlalu Pendek', 'Alasan minimal 50 karakter. Mohon jelaskan lebih detail mengapa Anda ingin menjadi creator.');
      return;
    }

    if (reason.trim().length > 500) {
      Alert.alert('Alasan Terlalu Panjang', 'Alasan maksimal 500 karakter.');
      return;
    }

    try {
      setIsSubmitting(true);

      await apiService.applyForBadge({
        badge_application_reason: reason.trim(),
        badge_is_culinary_creator: isCulinaryCreator,
      });

      // Refresh user data to update badge status to 'pending'
      await refreshUser();
      console.log('✅ User data refreshed after badge application');

      Alert.alert(
        'Permohonan Terkirim',
        'Permohonan Anda sedang ditinjau. Tunggu tim kami untuk mereview akun Anda.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit badge application:', error);
      Alert.alert(
        'Gagal Mengirim Permohonan',
        error.response?.data?.message || 'Terjadi kesalahan. Silakan coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = reason.length;
  const isValid = characterCount >= 50 && characterCount <= 500;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06402B" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengajuan Badge Creator</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.badgeIcon}>
            <Ionicons name="ribbon" size={48} color="#FFD700" />
          </View>
          <Text style={styles.infoTitle}>Creator Badge</Text>
          <Text style={styles.infoDescription}>
            Badge creator akan ditampilkan di profil Anda dan memberikan kredibilitas sebagai pembuat konten kuliner.
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Keuntungan Creator Badge:</Text>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Tampilkan badge creator di profil Anda</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Tingkatkan kredibilitas konten Anda</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.benefitText}>Dapatkan lebih banyak followers</Text>
          </View>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Formulir Pengajuan</Text>

          {/* Question 1 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Mengapa Anda ingin menjadi creator? <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.inputHint}>
              Jelaskan alasan Anda ingin mendapatkan badge creator (minimal 50 karakter)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                !isValid && characterCount > 0 && characterCount < 50 && styles.textAreaError,
              ]}
              placeholder="Contoh: Saya adalah seorang chef profesional dengan pengalaman 10 tahun di industri kuliner. Saya ingin berbagi resep dan tips memasak kepada komunitas..."
              placeholderTextColor="#9CA3AF"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={6}
              maxLength={500}
              textAlignVertical="top"
            />
            <View style={styles.characterCountContainer}>
              <Text
                style={[
                  styles.characterCount,
                  characterCount < 50 && characterCount > 0 && styles.characterCountError,
                  isValid && styles.characterCountValid,
                ]}
              >
                {characterCount}/500 karakter
              </Text>
              {characterCount < 50 && characterCount > 0 && (
                <Text style={styles.errorText}>Minimal 50 karakter</Text>
              )}
              {isValid && (
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              )}
            </View>
          </View>

          {/* Question 2 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Apakah Anda creator konten kuliner? <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                {isCulinaryCreator ? 'Ya, saya creator konten kuliner' : 'Tidak'}
              </Text>
              <Switch
                value={isCulinaryCreator}
                onValueChange={setIsCulinaryCreator}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={isCulinaryCreator ? '#06402B' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Kirim Permohonan</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
          <Text style={styles.disclaimerText}>
            Tim kami akan meninjau permohonan Anda dalam 1-3 hari kerja. Anda akan menerima notifikasi setelah review selesai.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#06402B',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  badgeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#06402B',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  benefitsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06402B',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06402B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textAreaError: {
    borderColor: '#EF4444',
  },
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  characterCountError: {
    color: '#EF4444',
  },
  characterCountValid: {
    color: '#10B981',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#06402B',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  disclaimerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 32,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default BadgeApplicationScreen;
