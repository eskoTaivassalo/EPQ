import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Custom hook for managing event categories
 * Provides functions to fetch, add, update, and delete categories
 */
const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Fetch all categories
  const fetchCategories = useCallback(async (forceRefresh = false) => {
    // Use cached categories if available and not forcing refresh
    if (categories.length > 0 && !forceRefresh && lastFetched) {
      // If last fetch was less than 5 minutes ago, use cached data
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (lastFetched > fiveMinutesAgo) {
        return categories;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create query with sorting
      const categoriesQuery = query(
        collection(db, 'categories'),
        orderBy('name', 'asc')
      );
      
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCategories(categoriesData);
      setLastFetched(new Date());
      return categoriesData;
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories");
      return [];
    } finally {
      setLoading(false);
    }
  }, [categories, lastFetched]);

  // Add a new category
  const addCategory = useCallback(async (categoryData) => {
    try {
      setLoading(true);
      setError(null);
      
      const docRef = await addDoc(collection(db, 'categories'), {
        ...categoryData,
        createdAt: new Date()
      });
      
      const newCategory = {
        id: docRef.id,
        ...categoryData,
        createdAt: new Date()
      };
      
      setCategories(prev => [...prev, newCategory].sort((a, b) => 
        a.name.localeCompare(b.name)
      ));
      
      return newCategory;
    } catch (err) {
      console.error("Error adding category:", err);
      setError("Failed to add category");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a category
  const updateCategory = useCallback(async (categoryId, categoryData) => {
    try {
      setLoading(true);
      setError(null);
      
      const categoryRef = doc(db, 'categories', categoryId);
      await updateDoc(categoryRef, {
        ...categoryData,
        updatedAt: new Date()
      });
      
      setCategories(prev => 
        prev.map(category => 
          category.id === categoryId 
            ? { ...category, ...categoryData, updatedAt: new Date() } 
            : category
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      
      return { id: categoryId, ...categoryData };
    } catch (err) {
      console.error("Error updating category:", err);
      setError("Failed to update category");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a category
  const deleteCategory = useCallback(async (categoryId) => {
    try {
      setLoading(true);
      setError(null);
      
      const categoryRef = doc(db, 'categories', categoryId);
      await deleteDoc(categoryRef);
      
      setCategories(prev => 
        prev.filter(category => category.id !== categoryId)
      );
      
      return true;
    } catch (err) {
      console.error("Error deleting category:", err);
      setError("Failed to delete category");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a single category by ID
  const getCategoryById = useCallback((categoryId) => {
    return categories.find(category => category.id === categoryId) || null;
  }, [categories]);

  // Get category name by ID
  const getCategoryName = useCallback((categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Uncategorized';
  }, [categories]);

  // Fetch categories on first mount
  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryName
  };
};

export default useCategories;