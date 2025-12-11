import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';

const TagSelector = ({ 
  title, 
  tags, 
  selectedTags, 
  onTagPress, 
  multiSelect = true,
  showIcons = false 
}) => {
  const isSelected = (tag) => {
    const tagValue = tag.id || tag;
    
    if (multiSelect) {
      return selectedTags.includes(tagValue);
    }
    
    // Single-select: handle both string and array formats
    if (Array.isArray(selectedTags)) {
      return selectedTags.length > 0 && selectedTags[0] === tagValue;
    }
    
    return selectedTags === tagValue;
  };

  const handleTagPress = (tag) => {
    const tagValue = tag.id || tag;
    
    if (multiSelect) {
      if (selectedTags.includes(tagValue)) {
        onTagPress(selectedTags.filter(t => t !== tagValue));
      } else {
        onTagPress([...selectedTags, tagValue]);
      }
    } else {
      onTagPress(tagValue);
    }
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.tagsWrapper}>
        {tags.map((tag, index) => (
          <TouchableOpacity
            key={tag.id || tag || index}
            style={[
              styles.tag,
              isSelected(tag) && styles.tagSelected
            ]}
            onPress={() => handleTagPress(tag)}
          >
            {showIcons && tag.icon && (
              <Ionicons 
                name={tag.icon} 
                size={16} 
                color={isSelected(tag) ? colors.white : colors.primary}
                style={styles.tagIcon}
              />
            )}
            <Text style={[
              styles.tagText,
              isSelected(tag) && styles.tagTextSelected
            ]}>
              {tag.label || tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagIcon: {
    marginRight: 4,
  },
  tagText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: colors.white,
  },
});

export default TagSelector;