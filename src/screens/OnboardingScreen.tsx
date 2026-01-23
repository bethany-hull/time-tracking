import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setSetting } from '../database/settings';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { requestNotificationPermissions } from '../services/notifications';
import { DEFAULT_CATEGORIES } from '../database/schema';
import { createCategory } from '../database/categories';
import { getDatabase } from '../database';

const { width, height } = Dimensions.get('window');

type PermissionStatus = 'pending' | 'granted' | 'denied';

interface OnboardingCard {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  permissionType?: 'microphone' | 'speechRecognition' | 'notifications';
  isCategories?: boolean;
}

const onboardingCards: OnboardingCard[] = [
  {
    id: '1',
    icon: 'time-outline',
    iconColor: '#6366f1',
    title: 'Welcome to Time Tracker',
    description:
      'Time Tracker helps people with time blindness understand how they spend their time. ' +
      'Many of us struggle to perceive how long tasks take or where our hours go. ' +
      'This app helps you build awareness by regularly recording what you\'re doing throughout the day.',
  },
  {
    id: '2',
    icon: 'mic-outline',
    iconColor: '#ec4899',
    title: 'Microphone Access',
    description:
      'We need access to your microphone so you can record voice entries. ' +
      'Simply speak what you\'ve been doing, and we\'ll capture your voice to process it.',
    permissionType: 'microphone',
  },
  {
    id: '3',
    icon: 'chatbubble-outline',
    iconColor: '#10b981',
    title: 'Speech Recognition',
    description:
      'We use speech recognition to convert your voice recordings into text. ' +
      'This text is then sent to AI to categorize your activities and track your time automatically.',
    permissionType: 'speechRecognition',
  },
  {
    id: '4',
    icon: 'notifications-outline',
    iconColor: '#f59e0b',
    title: 'Notifications',
    description:
      'Enable notifications so we can remind you to record what you\'re doing at regular intervals. ' +
      'These gentle reminders help you build a consistent habit of tracking your time.',
    permissionType: 'notifications',
  },
  {
    id: '5',
    icon: 'grid-outline',
    iconColor: '#8b5cf6',
    title: 'Choose Your Categories',
    description:
      'Select the categories that match your lifestyle. You can always change these later in settings.',
    isCategories: true,
  },
];

interface CategoryOption {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom?: boolean;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [permissionStatuses, setPermissionStatuses] = useState<Record<string, PermissionStatus>>({
    microphone: 'pending',
    speechRecognition: 'pending',
    notifications: 'pending',
  });
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(['work', 'personal', 'health', 'rest', 'other']) // Default selections
  );
  const [customCategories, setCustomCategories] = useState<CategoryOption[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Color palette for custom categories
  const customColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#8b5cf6', '#ec4899'];

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const addCustomCategory = () => {
    if (newCategoryName.trim()) {
      const id = `custom-${Date.now()}`;
      const colorIndex = customCategories.length % customColors.length;
      const newCategory: CategoryOption = {
        id,
        name: newCategoryName.trim(),
        color: customColors[colorIndex],
        icon: '📌',
        isCustom: true,
      };
      setCustomCategories(prev => [...prev, newCategory]);
      setSelectedCategories(prev => new Set([...prev, id]));
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const removeCustomCategory = (categoryId: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(categoryId);
      return newSet;
    });
  };

  const requestPermission = async (permissionType: string) => {
    try {
      let granted = false;

      switch (permissionType) {
        case 'microphone':
          // Microphone permission is requested together with speech recognition
          const micResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          granted = micResult.granted;
          break;
        case 'speechRecognition':
          // Speech recognition permission (includes microphone on most platforms)
          const speechResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          granted = speechResult.granted;
          // Also update microphone status since they're linked
          setPermissionStatuses(prev => ({
            ...prev,
            microphone: speechResult.granted ? 'granted' : 'denied',
          }));
          break;
        case 'notifications':
          granted = await requestNotificationPermissions();
          break;
      }

      setPermissionStatuses(prev => ({
        ...prev,
        [permissionType]: granted ? 'granted' : 'denied',
      }));

      // Auto-advance after permission request
      setTimeout(() => {
        handleNext();
      }, 500);
    } catch (error) {
      console.error(`Error requesting ${permissionType} permission:`, error);
      setPermissionStatuses(prev => ({
        ...prev,
        [permissionType]: 'denied',
      }));
    }
  };

  const handleNext = () => {
    if (currentIndex < onboardingCards.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    // Save selected categories to database
    const db = await getDatabase();
    const now = Math.floor(Date.now() / 1000);

    // First, clear any existing categories (in case of re-onboarding)
    await db.runAsync('DELETE FROM categories');

    // Insert selected default categories
    for (const cat of DEFAULT_CATEGORIES) {
      if (selectedCategories.has(cat.id)) {
        await db.runAsync(
          'INSERT INTO categories (id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [cat.id, cat.name, cat.color, cat.icon, now, now]
        );
      }
    }

    // Insert custom categories
    for (const cat of customCategories) {
      if (selectedCategories.has(cat.id)) {
        await db.runAsync(
          'INSERT INTO categories (id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [cat.id, cat.name, cat.color, cat.icon, now, now]
        );
      }
    }

    await setSetting('onboardingCompleted', 'true');
    onComplete();
  };

  const renderCard = ({ item }: { item: OnboardingCard }) => {
    const permissionStatus = item.permissionType ? permissionStatuses[item.permissionType] : null;
    
    // Special rendering for categories card
    if (item.isCategories) {
      return (
        <View style={styles.cardContainer}>
          <View style={[styles.card, styles.categoriesCard]}>
            <View style={[styles.iconContainer, styles.smallIconContainer, { backgroundColor: `${item.iconColor}15` }]}>
              <Ionicons name={item.icon} size={40} color={item.iconColor} />
            </View>
            <Text style={[styles.cardTitle, styles.smallTitle]}>{item.title}</Text>
            <Text style={[styles.cardDescription, styles.smallDescription]}>{item.description}</Text>
            
            <ScrollView 
              style={styles.categoriesScrollView} 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.categoriesScrollContent}
              nestedScrollEnabled={true}
            >
              {/* Default categories */}
              <View style={styles.categoriesGrid}>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      selectedCategories.has(cat.id) && { backgroundColor: cat.color },
                      !selectedCategories.has(cat.id) && { borderColor: cat.color, borderWidth: 2 },
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text 
                      style={[
                        styles.categoryName,
                        selectedCategories.has(cat.id) && styles.categoryNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    {selectedCategories.has(cat.id) && (
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
                
                {/* Custom categories */}
                {customCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      selectedCategories.has(cat.id) && { backgroundColor: cat.color },
                      !selectedCategories.has(cat.id) && { borderColor: cat.color, borderWidth: 2 },
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                    onLongPress={() => removeCustomCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text 
                      style={[
                        styles.categoryName,
                        selectedCategories.has(cat.id) && styles.categoryNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    {selectedCategories.has(cat.id) && (
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Add custom category */}
              {showAddCategory ? (
                <View style={styles.addCategoryForm}>
                  <TextInput
                    style={styles.addCategoryInput}
                    placeholder="Category name..."
                    placeholderTextColor="#9ca3af"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    autoFocus
                    onSubmitEditing={addCustomCategory}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.addCategoryConfirm}
                    onPress={addCustomCategory}
                  >
                    <Ionicons name="checkmark" size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addCategoryCancel}
                    onPress={() => {
                      setShowAddCategory(false);
                      setNewCategoryName('');
                    }}
                  >
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addCategoryButton}
                  onPress={() => setShowAddCategory(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
                  <Text style={styles.addCategoryText}>Add Custom Category</Text>
                </TouchableOpacity>
              )}
              
              <Text style={styles.categoryHint}>
                {selectedCategories.size} categories selected • Long press custom categories to remove
              </Text>
            </ScrollView>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: `${item.iconColor}15` }]}>
            <Ionicons name={item.icon} size={64} color={item.iconColor} />
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
          
          {item.permissionType && (
            <View style={styles.permissionButtonContainer}>
              {permissionStatus === 'granted' ? (
                <View style={styles.permissionGranted}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <Text style={styles.permissionGrantedText}>Permission Granted</Text>
                </View>
              ) : permissionStatus === 'denied' ? (
                <View style={styles.permissionDenied}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                  <Text style={styles.permissionDeniedText}>Permission Denied</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.allowButton, { backgroundColor: item.iconColor }]}
                  onPress={() => requestPermission(item.permissionType!)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.allowButtonText}>Allow Access</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPagination = () => (
    <View style={styles.pagination}>
      {onboardingCards.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: '#6366f1',
              },
            ]}
          />
        );
      })}
    </View>
  );

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = (event: any) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(newIndex);
  };

  const isLastCard = currentIndex === onboardingCards.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.flatListContainer}>
        <FlatList
          ref={flatListRef}
          data={onboardingCards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          bounces={false}
        />
      </View>

      {renderPagination()}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isLastCard ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={isLastCard ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  flatListContainer: {
    flex: 1,
  },
  cardContainer: {
    width,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: '100%',
    maxWidth: 360,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  cardDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButtonContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  allowButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  allowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionGranted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  permissionGrantedText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionDenied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  permissionDeniedText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  nextButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Categories card styles
  categoriesCard: {
    padding: 20,
    flex: 1,
    maxHeight: height * 0.7,
  },
  smallIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  smallTitle: {
    fontSize: 20,
    marginBottom: 8,
  },
  smallDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  categoriesScrollView: {
    flex: 1,
    width: '100%',
    maxHeight: height * 0.4,
  },
  categoriesScrollContent: {
    paddingBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
    minWidth: 100,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flexShrink: 1,
  },
  categoryNameSelected: {
    color: '#fff',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },
  addCategoryText: {
    fontSize: 15,
    color: '#6366f1',
    fontWeight: '600',
  },
  addCategoryForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  addCategoryInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  addCategoryConfirm: {
    backgroundColor: '#10b981',
    padding: 10,
    borderRadius: 10,
  },
  addCategoryCancel: {
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 10,
  },
  categoryHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
  },
});
