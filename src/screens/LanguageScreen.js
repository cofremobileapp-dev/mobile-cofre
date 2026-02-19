import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const LANGUAGES = [
  {
    code: 'id',
    name: 'Bahasa Indonesia',
    nativeName: 'Bahasa Indonesia',
    flag: '🇮🇩',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
];

const LanguageScreen = () => {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();
  const { language, setLanguage, t, isLoading: isLanguageLoading } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectLanguage = async (languageCode) => {
    if (languageCode === language) return;

    try {
      setIsSaving(true);
      const success = await setLanguage(languageCode);

      if (success) {
        Alert.alert(
          t('success'),
          t('languageChangeSuccess'),
          [
            {
              text: t('ok'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(t('error'), t('languageChangeFailed'));
      }
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert(t('error'), t('languageChangeFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLanguageLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('languageSettings')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('languageSettings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="globe" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('languageSelectDesc')}
          </Text>
        </View>

        {/* Language Options */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageItem,
                { borderTopColor: colors.borderLight },
                language === lang.code && { backgroundColor: colors.primaryLight },
              ]}
              onPress={() => handleSelectLanguage(lang.code)}
              disabled={isSaving}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.flagEmoji}>{lang.flag}</Text>
                <View style={styles.languageText}>
                  <Text style={[styles.languageName, { color: colors.textPrimary }]}>{lang.name}</Text>
                  <Text style={[styles.languageNative, { color: colors.textTertiary }]}>{lang.nativeName}</Text>
                </View>
              </View>

              {language === lang.code && (
                <View style={styles.checkmark}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Note */}
        <View style={[styles.noteCard, { backgroundColor: isDark ? colors.card : '#EFF6FF', borderColor: isDark ? colors.border : '#BFDBFE' }]}>
          <Ionicons name="information-circle" size={20} color={isDark ? colors.info : '#2563EB'} />
          <View style={styles.noteTextContainer}>
            <Text style={[styles.noteTitle, { color: isDark ? colors.textPrimary : '#1E40AF' }]}>{t('languageNote')}</Text>
            <Text style={[styles.noteText, { color: isDark ? colors.textSecondary : '#1E40AF' }]}>
              {t('languageNoteDesc')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  section: {
    marginTop: 12,
    paddingVertical: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  languageNative: {
    fontSize: 14,
  },
  checkmark: {
    marginLeft: 12,
  },
  noteCard: {
    margin: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  noteTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default LanguageScreen;
