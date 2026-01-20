import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../database/categories';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryWithEntryCount,
} from '../database/categories';

// Available colors for categories
const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#ef4444', // red
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#6b7280', // gray
];

// Available emojis for categories
const CATEGORY_EMOJIS = [
  '💼', '🏠', '💪', '📚', '👥', '☕', '🎯', '💻', '📝', '🎨',
  '🎵', '🎮', '📞', '✉️', '🛒', '🏥', '🍽️', '😴', '🎓', '📸',
  '🚗', '✈️', '❤️', '🏃', '🚴', '🧘', '🎬', '🎤', '🎸', '⚽',
  '🏀', '🎾', '🏊', '⛳', '🎲', '🧩', '🎪', '🎭', '🌱', '🐾',
  '🍕', '🍔', '🍺', '🍷', '🎂', '🏖️', '⛷️', '🎿', '🛠️', '📌',
];

interface CategoryEditorProps {
  category: Category | null;
  visible: boolean;
  onClose: () => void;
  onSave: (category: { name: string; color: string; icon: string }) => void;
  isNew: boolean;
}

function CategoryEditor({ category, visible, onClose, onSave, isNew }: CategoryEditorProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(CATEGORY_EMOJIS[0]);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
      setIcon(category.icon);
    } else {
      setName('');
      setColor(CATEGORY_COLORS[0]);
      setIcon(CATEGORY_EMOJIS[0]);
    }
  }, [category, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    onSave({ name: name.trim(), color, icon });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={editorStyles.container}>
        <View style={editorStyles.header}>
          <TouchableOpacity onPress={onClose} style={editorStyles.headerButton}>
            <Text style={editorStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={editorStyles.headerTitle}>
            {isNew ? 'New Category' : 'Edit Category'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={editorStyles.headerButton}>
            <Text style={editorStyles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={editorStyles.content} showsVerticalScrollIndicator={false}>
          {/* Preview */}
          <View style={editorStyles.previewContainer}>
            <View style={[editorStyles.previewBadge, { backgroundColor: color + '20' }]}>
              <Text style={editorStyles.previewEmoji}>{icon}</Text>
              <Text style={[editorStyles.previewText, { color }]}>
                {name || 'Category Name'}
              </Text>
            </View>
          </View>

          {/* Name Input */}
          <View style={editorStyles.section}>
            <Text style={editorStyles.sectionTitle}>Name</Text>
            <TextInput
              style={editorStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter category name"
              placeholderTextColor="#9ca3af"
              maxLength={30}
            />
          </View>

          {/* Color Picker */}
          <View style={editorStyles.section}>
            <Text style={editorStyles.sectionTitle}>Color</Text>
            <View style={editorStyles.colorGrid}>
              {CATEGORY_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    editorStyles.colorOption,
                    { backgroundColor: c },
                    color === c && editorStyles.colorSelected,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Icon Picker */}
          <View style={editorStyles.section}>
            <Text style={editorStyles.sectionTitle}>Emoji</Text>
            <View style={editorStyles.iconGrid}>
              {CATEGORY_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    editorStyles.iconOption,
                    icon === emoji && { backgroundColor: color + '20', borderColor: color },
                  ]}
                  onPress={() => setIcon(emoji)}
                >
                  <Text style={editorStyles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const editorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  previewText: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiText: {
    fontSize: 24,
  },
  previewEmoji: {
    fontSize: 24,
  },
});

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);

  const loadCategories = async () => {
    const cats = await getAllCategories();
    setCategories(cats);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsNew(true);
    setEditorVisible(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsNew(false);
    setEditorVisible(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    // Get all categories with entry counts to find this one
    const categoriesWithCounts = await getCategoryWithEntryCount();
    const categoryWithCount = categoriesWithCounts.find(c => c.id === category.id);
    const entryCount = categoryWithCount?.entry_count || 0;

    const message = entryCount > 0
      ? `This category has ${entryCount} time ${entryCount === 1 ? 'entry' : 'entries'}. Deleting it will NOT delete the entries, but they will become uncategorized.`
      : 'Are you sure you want to delete this category?';

    Alert.alert(
      `Delete "${category.name}"?`,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(category.id);
            loadCategories();
          },
        },
      ]
    );
  };

  const handleSave = async (data: { name: string; color: string; icon: string }) => {
    try {
      if (isNew) {
        await createCategory(data);
      } else if (editingCategory) {
        await updateCategory(editingCategory.id, data);
      }
      setEditorVisible(false);
      loadCategories();
    } catch (error) {
      Alert.alert('Error', 'Failed to save category. Please try again.');
      console.error('Error saving category:', error);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <TouchableOpacity onPress={handleAddCategory} style={styles.addButton}>
          <Ionicons name="add-circle" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryList}>
        {categories.map((category, index) => (
          <View
            key={category.id}
            style={[
              styles.categoryRow,
              index === categories.length - 1 && styles.categoryRowLast,
            ]}
          >
            <View style={styles.categoryInfo}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: category.color + '20' },
                ]}
              >
                <Text style={styles.categoryEmoji}>{category.icon}</Text>
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>
            <View style={styles.categoryActions}>
              <TouchableOpacity
                onPress={() => handleEditCategory(category)}
                style={styles.actionButton}
              >
                <Ionicons name="pencil" size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteCategory(category)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <CategoryEditor
        category={editingCategory}
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        onSave={handleSave}
        isNew={isNew}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addButton: {
    padding: 4,
  },
  categoryList: {
    gap: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryRowLast: {
    borderBottomWidth: 0,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
});
