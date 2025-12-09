"""
WavToMidi - Audio to MIDI conversion utility
Converts WAV/audio files to MIDI using pitch detection and note onset analysis
"""

import librosa
import numpy as np
from typing import List, Dict, Tuple, Optional
import tempfile
import os
from dataclasses import dataclass
from scipy.signal import find_peaks


@dataclass
class MidiNote:
    """Represents a MIDI note with timing information"""
    pitch: int  # MIDI note number (0-127)
    velocity: int  # Note velocity (0-127)
    start_time: float  # Start time in seconds
    end_time: float  # End time in seconds
    confidence: float  # Confidence score (0.0-1.0)


@dataclass
class ConversionSettings:
    """Settings for audio to MIDI conversion"""
    hop_length: int = 512  # Audio analysis hop length
    frame_rate: int = 22050  # Sample rate for analysis
    min_note_duration: float = 0.1  # Minimum note duration in seconds
    pitch_threshold: float = 0.3  # Minimum pitch confidence
    onset_threshold: float = 0.3  # Onset detection threshold
    tuning_tolerance: int = 50  # Cents tolerance for pitch quantization


class WavToMidiConverter:
    """Main audio to MIDI conversion class"""
    
    def __init__(self, settings: Optional[ConversionSettings] = None):
        self.settings = settings or ConversionSettings()
        self.pitch_classes = ['C', 'C#', 'D', 'D#', 'E', 'F', 
                             'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    def convert(self, audio_file_path: str) -> Dict:
        """Convert audio file to MIDI data"""
        try:
            # Load audio file
            y, sr = librosa.load(audio_file_path, sr=self.settings.frame_rate)
            
            # Extract features
            pitches, magnitudes = self._extract_pitches(y, sr)
            onsets = self._detect_onsets(y, sr)
            
            # Convert to MIDI notes
            midi_notes = self._pitches_to_midi_notes(pitches, magnitudes, onsets, sr)
            
            # Filter and clean notes
            midi_notes = self._filter_notes(midi_notes)
            
            # Convert to serializable format
            midi_data = self._format_midi_data(midi_notes, audio_file_path)
            
            return midi_data
            
        except Exception as e:
            raise Exception(f"Error converting audio to MIDI: {str(e)}")
    
    def _extract_pitches(self, y: np.ndarray, sr: int) -> Tuple[np.ndarray, np.ndarray]:
        """Extract pitch information from audio signal"""
        # Use librosa's pitch tracking
        pitches, magnitudes = librosa.piptrack(
            y=y, 
            sr=sr, 
            hop_length=self.settings.hop_length,
            threshold=self.settings.pitch_threshold
        )
        
        # Get the most prominent pitch at each time frame
        pitch_track = []
        magnitude_track = []
        
        for t in range(pitches.shape[1]):
            index = magnitudes[:, t].argmax()
            pitch = pitches[index, t]
            magnitude = magnitudes[index, t]
            
            pitch_track.append(pitch)
            magnitude_track.append(magnitude)
        
        return np.array(pitch_track), np.array(magnitude_track)
    
    def _detect_onsets(self, y: np.ndarray, sr: int) -> np.ndarray:
        """Detect note onsets in the audio signal"""
        # Use librosa's onset detection
        onset_frames = librosa.onset.onset_detect(
            y=y,
            sr=sr,
            hop_length=self.settings.hop_length,
            delta=self.settings.onset_threshold
        )
        
        # Convert frames to time
        onset_times = librosa.frames_to_time(
            onset_frames,
            sr=sr,
            hop_length=self.settings.hop_length
        )
        
        return onset_times
    
    def _pitches_to_midi_notes(self, pitches: np.ndarray, magnitudes: np.ndarray,
                              onsets: np.ndarray, sr: int) -> List[MidiNote]:
        """Convert pitch track to MIDI notes"""
        midi_notes = []
        
        # Calculate time for each frame
        hop_length = self.settings.hop_length
        frame_times = np.arange(len(pitches)) * hop_length / sr
        
        # Group consecutive frames with similar pitch into notes
        current_note = None
        note_start_time = 0
        
        for i, (pitch, magnitude, time) in enumerate(zip(pitches, magnitudes, frame_times)):
            if pitch > 0 and magnitude > self.settings.pitch_threshold:
                # Convert Hz to MIDI note number
                midi_pitch = self._hz_to_midi(pitch)
                
                if current_note is None:
                    # Start new note
                    current_note = midi_pitch
                    note_start_time = time
                    
                elif abs(current_note - midi_pitch) > 0.5:  # More than half semitone difference
                    # End current note and start new one
                    if time - note_start_time >= self.settings.min_note_duration:
                        note = MidiNote(
                            pitch=int(round(current_note)),
                            velocity=int(magnitude * 127),
                            start_time=note_start_time,
                            end_time=time,
                            confidence=magnitude
                        )
                        midi_notes.append(note)
                    
                    current_note = midi_pitch
                    note_start_time = time
                    
            else:
                # No pitch detected, end current note if any
                if current_note is not None:
                    if time - note_start_time >= self.settings.min_note_duration:
                        note = MidiNote(
                            pitch=int(round(current_note)),
                            velocity=int(magnitudes[i-1] * 127) if i > 0 else 64,
                            start_time=note_start_time,
                            end_time=time,
                            confidence=magnitudes[i-1] if i > 0 else 0.5
                        )
                        midi_notes.append(note)
                    current_note = None
        
        # End final note if any
        if current_note is not None and len(frame_times) > 0:
            final_time = frame_times[-1]
            if final_time - note_start_time >= self.settings.min_note_duration:
                note = MidiNote(
                    pitch=int(round(current_note)),
                    velocity=int(magnitudes[-1] * 127),
                    start_time=note_start_time,
                    end_time=final_time,
                    confidence=magnitudes[-1]
                )
                midi_notes.append(note)
        
        return midi_notes
    
    def _hz_to_midi(self, frequency: float) -> float:
        """Convert frequency in Hz to MIDI note number"""
        if frequency <= 0:
            return 0
        
        # MIDI note 69 (A4) = 440 Hz
        return 69 + 12 * np.log2(frequency / 440.0)
    
    def _midi_to_note_name(self, midi_pitch: int) -> str:
        """Convert MIDI pitch to note name"""
        octave = (midi_pitch // 12) - 1
        note_class = self.pitch_classes[midi_pitch % 12]
        return f"{note_class}{octave}"
    
    def _filter_notes(self, midi_notes: List[MidiNote]) -> List[MidiNote]:
        """Filter and clean up detected notes"""
        if not midi_notes:
            return midi_notes
        
        # Sort by start time
        midi_notes.sort(key=lambda x: x.start_time)
        
        # Remove notes that are too short
        filtered_notes = [
            note for note in midi_notes 
            if (note.end_time - note.start_time) >= self.settings.min_note_duration
        ]
        
        # Remove notes with very low confidence
        filtered_notes = [
            note for note in filtered_notes 
            if note.confidence >= self.settings.pitch_threshold
        ]
        
        # Quantize pitches to nearest semitone
        for note in filtered_notes:
            note.pitch = max(0, min(127, int(round(note.pitch))))
            note.velocity = max(1, min(127, note.velocity))
        
        return filtered_notes
    
    def _format_midi_data(self, midi_notes: List[MidiNote], source_file: str) -> Dict:
        """Format MIDI notes into serializable data structure"""
        return {
            'notes': [
                {
                    'pitch': note.pitch,
                    'velocity': note.velocity,
                    'start_time': note.start_time,
                    'end_time': note.end_time,
                    'duration': note.end_time - note.start_time,
                    'note_name': self._midi_to_note_name(note.pitch),
                    'confidence': note.confidence
                }
                for note in midi_notes
            ],
            'metadata': {
                'source_file': os.path.basename(source_file),
                'conversion_settings': {
                    'hop_length': self.settings.hop_length,
                    'frame_rate': self.settings.frame_rate,
                    'min_note_duration': self.settings.min_note_duration,
                    'pitch_threshold': self.settings.pitch_threshold
                },
                'note_count': len(midi_notes),
                'total_duration': max(note.end_time for note in midi_notes) if midi_notes else 0,
                'pitch_range': {
                    'min': min(note.pitch for note in midi_notes) if midi_notes else 0,
                    'max': max(note.pitch for note in midi_notes) if midi_notes else 0
                }
            },
            'statistics': self._calculate_statistics(midi_notes)
        }
    
    def _calculate_statistics(self, midi_notes: List[MidiNote]) -> Dict:
        """Calculate statistics about the converted MIDI"""
        if not midi_notes:
            return {}
        
        pitches = [note.pitch for note in midi_notes]
        durations = [note.end_time - note.start_time for note in midi_notes]
        velocities = [note.velocity for note in midi_notes]
        confidences = [note.confidence for note in midi_notes]
        
        return {
            'pitch_stats': {
                'mean': float(np.mean(pitches)),
                'std': float(np.std(pitches)),
                'range': [int(min(pitches)), int(max(pitches))]
            },
            'duration_stats': {
                'mean': float(np.mean(durations)),
                'std': float(np.std(durations)),
                'range': [float(min(durations)), float(max(durations))]
            },
            'velocity_stats': {
                'mean': float(np.mean(velocities)),
                'std': float(np.std(velocities)),
                'range': [int(min(velocities)), int(max(velocities))]
            },
            'confidence_stats': {
                'mean': float(np.mean(confidences)),
                'std': float(np.std(confidences)),
                'range': [float(min(confidences)), float(max(confidences))]
            }
        }
    
    def save_midi_file(self, midi_data: Dict, output_path: str) -> str:
        """Save MIDI data to file (placeholder for actual MIDI file writing)"""
        # This would use a library like mido or music21 to write actual MIDI files
        # For now, save as JSON
        import json
        
        json_path = output_path.replace('.mid', '.json')
        with open(json_path, 'w') as f:
            json.dump(midi_data, f, indent=2)
        
        return json_path
    
    def get_supported_formats(self) -> List[str]:
        """Get list of supported audio formats"""
        return ['wav', 'mp3', 'flac', 'aiff', 'm4a', 'ogg']
    
    def validate_audio_file(self, file_path: str) -> bool:
        """Validate if audio file can be processed"""
        try:
            y, sr = librosa.load(file_path, duration=1.0)  # Load just 1 second for validation
            return len(y) > 0
        except:
            return False