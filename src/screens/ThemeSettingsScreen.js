import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSettingsScreen = () => {
  const navigation = useNavigation();
  const { theme, setTheme, isDark, colors, THEMES } = useTheme();

  const themeOptions = [
    {
      value: THEMES.LIGHT,
      label: 'Mode Terang',
      description: 'Tampilan terang untuk siang hari',
      icon: 'sunny',
    },
    {
      value: THEMES.DARK,
      label: 'Mode Gelap',
      description: 'Tampilan gelap untuk menghemat baterai',
      icon: 'moon',
    },
    {
      value: THEMES.AUTO,
      label: 'Otomatis',
      description: 'Otomatis berubah sesuai pengaturan gelap/terang perangkat Anda',
      icon: 'phone-portrait',
    },
  ];

  const handleSelectTheme = (value) => {
    setTheme(value);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Tema Aplikasi</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="color-palette" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Pilih tema tampilan aplikasi sesuai preferensi Anda
          </Text>
        </View>

        {/* Theme Options */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          {themeOptions.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.themeItem,
                theme === option.value && { backgroundColor: colors.primaryLight },
                index === 0 && styles.firstItem,
                index === themeOptions.length - 1 && styles.lastItem,
                { borderTopColor: colors.borderLight },
              ]}
              onPress={() => handleSelectTheme(option.value)}
            >
              <View style={styles.themeInfo}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor:
                        theme === option.value ? colors.primary : colors.backgroundTertiary,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={theme === option.value ? colors.textInverse : colors.iconSecondary}
                  />
                </View>
                <View style={styles.themeText}>
                  <Text
                    style={[
                      styles.themeLabel,
                      {
                        color: theme === option.value ? colors.primary : colors.textPrimary,
                        fontWeight: theme === option.value ? '700' : '600',
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={[styles.themeDescription, { color: colors.textTertiary }]}>
                    {option.description}
                  </Text>
                </View>
              </View>

              {theme === option.value && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview Card - REMOVED per user request */}

        {/* Benefits */}
        <View style={[styles.benefitsCard, { backgroundColor: isDark ? colors.card : colors.infoLight, borderColor: isDark ? colors.border : colors.info }]}>
          <Text style={[styles.benefitsTitle, { color: isDark ? colors.textPrimary : colors.info }]}>
            {theme === THEMES.AUTO
              ? '📱 Mode Otomatis Aktif'
              : isDark
                ? '🌙 Keuntungan Mode Gelap'
                : '☀️ Keuntungan Mode Terang'}
          </Text>
          <Text style={[styles.benefitsText, { color: isDark ? colors.textSecondary : colors.info }]}>
            {theme === THEMES.AUTO
              ? '• Tema berubah otomatis sesuai pengaturan perangkat\n' +
                '• Mode gelap aktif saat perangkat dalam mode gelap\n' +
                '• Mode terang aktif saat perangkat dalam mode terang\n' +
                `• Saat ini: ${isDark ? 'Mode Gelap' : 'Mode Terang'} (dari perangkat)`
              : isDark
                ? '• Mengurangi kelelahan mata di malam hari\n' +
                  '• Menghemat daya baterai pada layar OLED\n' +
                  '• Lebih nyaman di lingkungan gelap\n' +
                  '• Mengurangi paparan cahaya biru'
                : '• Lebih jelas di bawah sinar matahari\n' +
                  '• Warna lebih cerah dan jelas\n' +
                  '• Familiar dengan kebanyakan aplikasi\n' +
                  '• Meningkatkan keterbacaan teks'}
          </Text>
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
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  firstItem: {
    borderTopWidth: 0,
  },
  lastItem: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  themeText: {
    flex: 1,
  },
  themeLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
  },
  checkmark: {
    marginLeft: 12,
  },
  previewCard: {
    margin: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewContent: {
    gap: 8,
  },
  previewItem: {
    padding: 12,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '500',
  },
  benefitsCard: {
    margin: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  benefitsText: {
    fontSize: 14,
    lineHeight: 22,
  },
});

export default ThemeSettingsScreen;
