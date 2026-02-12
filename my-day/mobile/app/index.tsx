import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

const API_URL = 'http://192.168.1.121:3000';

interface Task {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Index() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle }),
      });
      if (!response.ok) throw new Error('Failed to create task');
      setNewTaskTitle('');
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, completed: !task.completed }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          placeholder="Add a new task..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={createTask}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.taskItem}>
              <TouchableOpacity
                style={styles.taskContent}
                onPress={() => toggleTask(item)}
              >
                <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
                  {item.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTask(item.id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  errorText: {
    textAlign: 'center',
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 10,
  },
  taskItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 16,
    color: '#333',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
