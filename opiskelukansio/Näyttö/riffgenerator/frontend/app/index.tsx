import React, { useState, useEffect } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator 
} from "react-native";
import { apiClient } from '../../shared/api';
import { RiffData, RiffStyle } from '../../shared/types';

export default function Index() {
  const [riff, setRiff] = useState<RiffData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<RiffStyle>(RiffStyle.ROCK);
  const [tempo, setTempo] = useState(120);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkConnection();
    loadAvailableStyles();
  }, []);

  const checkConnection = async () => {
    const response = await apiClient.healthCheck();
    setIsConnected(response.success);
    if (!response.success) {
      Alert.alert('Connection Error', 'Cannot connect to backend server');
    }
  };

  const loadAvailableStyles = async () => {
    const response = await apiClient.getAvailableStyles();
    if (response.success && response.data) {
      setAvailableStyles(response.data);
    }
  };

  const generateRiff = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.generateRiff({
        style: selectedStyle,
        tempo: tempo,
        key: 'C',
        duration: 8
      });

      if (response.success && response.data) {
        setRiff(response.data);
        Alert.alert('Success', 'Riff generated successfully!');
      } else {
        Alert.alert('Error', response.error || 'Failed to generate riff');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate riff');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>RiffGenerator</Text>
        <View style={[styles.status, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Text style={styles.sectionTitle}>Generate Riff</Text>
        
        <View style={styles.parameterGroup}>
          <Text style={styles.label}>Style: {selectedStyle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleSelector}>
            {Object.values(RiffStyle).map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.styleButton,
                  selectedStyle === style && styles.selectedStyle
                ]}
                onPress={() => setSelectedStyle(style)}
              >
                <Text style={[
                  styles.styleButtonText,
                  selectedStyle === style && styles.selectedStyleText
                ]}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.parameterGroup}>
          <Text style={styles.label}>Tempo: {tempo} BPM</Text>
          <View style={styles.tempoControls}>
            <TouchableOpacity 
              style={styles.tempoButton} 
              onPress={() => setTempo(Math.max(60, tempo - 10))}
            >
              <Text style={styles.tempoButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.tempoButton} 
              onPress={() => setTempo(Math.min(200, tempo + 10))}
            >
              <Text style={styles.tempoButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.generateButton, (!isConnected || isGenerating) && styles.disabledButton]}
          onPress={generateRiff}
          disabled={!isConnected || isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Riff</Text>
          )}
        </TouchableOpacity>
      </View>

      {riff && (
        <View style={styles.riffDisplay}>
          <Text style={styles.sectionTitle}>Generated Riff</Text>
          <View style={styles.riffInfo}>
            <Text style={styles.riffDetail}>Style: {riff.config.style}</Text>
            <Text style={styles.riffDetail}>Tempo: {riff.config.tempo} BPM</Text>
            <Text style={styles.riffDetail}>Key: {riff.config.key}</Text>
            <Text style={styles.riffDetail}>Notes: {riff.metadata.note_count}</Text>
            <Text style={styles.riffDetail}>Duration: {riff.metadata.total_duration.toFixed(2)}s</Text>
          </View>
          
          <Text style={styles.notesTitle}>Notes:</Text>
          <ScrollView style={styles.notesContainer}>
            {riff.notes.map((note, index) => (
              <View key={index} style={styles.noteItem}>
                <Text style={styles.noteText}>
                  Note {index + 1}: Pitch {note.pitch}, Velocity {note.velocity}, 
                  Time {note.start_time.toFixed(2)}s, Duration {note.duration.toFixed(2)}s
                  {note.string && note.fret && ` (String ${note.string}, Fret ${note.fret})`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  status: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controls: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  parameterGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  styleSelector: {
    maxHeight: 50,
  },
  styleButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  selectedStyle: {
    backgroundColor: '#2196F3',
  },
  styleButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  selectedStyleText: {
    color: '#fff',
  },
  tempoControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tempoButton: {
    width: 40,
    height: 40,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  tempoButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  riffDisplay: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  riffInfo: {
    marginBottom: 15,
  },
  riffDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  notesContainer: {
    maxHeight: 200,
  },
  noteItem: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 5,
    borderRadius: 5,
  },
  noteText: {
    fontSize: 12,
    color: '#555',
  },
});
