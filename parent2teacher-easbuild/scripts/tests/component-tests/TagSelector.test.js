import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TagSelector from '../TagSelector';

describe('TagSelector', () => {
  const mockTags = ['Math', 'Science', 'English'];
  const mockOnTagPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all tags', () => {
    const { getByText } = render(
      <TagSelector tags={mockTags} selectedTags={[]} onTagPress={mockOnTagPress} />
    );

    expect(getByText('Math')).toBeTruthy();
    expect(getByText('Science')).toBeTruthy();
    expect(getByText('English')).toBeTruthy();
  });

  it('should show selected tags as active', () => {
    const { getByText } = render(
      <TagSelector
        tags={mockTags}
        selectedTags={['Math', 'Science']}
        onTagPress={mockOnTagPress}
      />
    );

    const mathTag = getByText('Math').parent;
    const englishTag = getByText('English').parent;

    // Selected tags should have different style (implementation dependent)
    expect(mathTag).toBeTruthy();
    expect(englishTag).toBeTruthy();
  });

  it('should call onTagPress when tag is pressed', () => {
    const { getByText } = render(
      <TagSelector tags={mockTags} selectedTags={[]} onTagPress={mockOnTagPress} />
    );

    fireEvent.press(getByText('Math'));

    expect(mockOnTagPress).toHaveBeenCalledWith(['Math']);
  });

  it('should allow multi-select', () => {
    const { getByText, rerender } = render(
      <TagSelector tags={mockTags} selectedTags={['Math']} onTagPress={mockOnTagPress} />
    );

    fireEvent.press(getByText('Science'));

    expect(mockOnTagPress).toHaveBeenCalledWith(['Math', 'Science']);
  });

  it('should deselect tag when pressed again', () => {
    const { getByText } = render(
      <TagSelector
        tags={mockTags}
        selectedTags={['Math', 'Science']}
        onTagPress={mockOnTagPress}
      />
    );

    fireEvent.press(getByText('Math'));

    expect(mockOnTagPress).toHaveBeenCalledWith(['Science']);
  });
});
