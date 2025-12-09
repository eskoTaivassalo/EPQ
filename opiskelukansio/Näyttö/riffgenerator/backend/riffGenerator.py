"""
RiffGenerator - Core music generation logic
Generates guitar/bass riffs using algorithmic composition
"""

import random
import numpy as np
from typing import Dict, List, Tuple, Optional
import json
import tempfile
from dataclasses import dataclass
from enum import Enum


class RiffStyle(Enum):
    """Available riff styles"""
    ROCK = "rock"
    BLUES = "blues"
    METAL = "metal"
    FUNK = "funk"
    JAZZ = "jazz"
    ACOUSTIC = "acoustic"


class TimeSignature(Enum):
    """Time signatures"""
    FOUR_FOUR = (4, 4)
    THREE_FOUR = (3, 4)
    SEVEN_EIGHT = (7, 8)


@dataclass
class Note:
    """Represents a musical note"""
    pitch: int  # MIDI note number
    velocity: int  # 0-127
    start_time: float  # in beats
    duration: float  # in beats
    string: Optional[int] = None  # Guitar string (1-6)
    fret: Optional[int] = None  # Guitar fret


@dataclass
class RiffConfig:
    """Configuration for riff generation"""
    style: RiffStyle
    tempo: int
    key: str
    time_signature: TimeSignature
    duration_bars: int
    complexity: float  # 0.0-1.0


class RiffGenerator:
    """Main riff generation class"""
    
    def __init__(self):
        self.scales = self._init_scales()
        self.chord_progressions = self._init_chord_progressions()
        self.rhythm_patterns = self._init_rhythm_patterns()
        
    def _init_scales(self) -> Dict[str, List[int]]:
        """Initialize musical scales (intervals from root)"""
        return {
            'major': [0, 2, 4, 5, 7, 9, 11],
            'minor': [0, 2, 3, 5, 7, 8, 10],
            'pentatonic_major': [0, 2, 4, 7, 9],
            'pentatonic_minor': [0, 3, 5, 7, 10],
            'blues': [0, 3, 5, 6, 7, 10],
            'dorian': [0, 2, 3, 5, 7, 9, 10],
            'mixolydian': [0, 2, 4, 5, 7, 9, 10]
        }
    
    def _init_chord_progressions(self) -> Dict[RiffStyle, List[List[int]]]:
        """Initialize common chord progressions for each style"""
        return {
            RiffStyle.ROCK: [
                [1, 4, 5, 1],  # I-IV-V-I
                [1, 5, 6, 4],  # I-V-vi-IV
                [6, 4, 1, 5]   # vi-IV-I-V
            ],
            RiffStyle.BLUES: [
                [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5]  # 12-bar blues
            ],
            RiffStyle.METAL: [
                [1, 6, 4, 5],  # i-VI-IV-V
                [1, 3, 7, 1]   # i-III-VII-i
            ],
            RiffStyle.FUNK: [
                [1, 1, 1, 1],  # Static harmony
                [1, 4, 1, 4]   # Simple I-IV
            ],
            RiffStyle.JAZZ: [
                [1, 6, 2, 5],  # I-vi-ii-V
                [3, 6, 2, 5]   # iii-vi-ii-V
            ]
        }
    
    def _init_rhythm_patterns(self) -> Dict[RiffStyle, List[List[float]]]:
        """Initialize rhythm patterns for each style"""
        return {
            RiffStyle.ROCK: [
                [1.0, 0.5, 0.5, 1.0],  # Quarter, eighth, eighth, quarter
                [0.5, 0.5, 1.0, 1.0],  # Eighth, eighth, quarter, quarter
                [1.0, 1.0, 0.5, 0.5]   # Quarter, quarter, eighth, eighth
            ],
            RiffStyle.BLUES: [
                [1.0, 0.5, 0.5, 1.0],
                [0.75, 0.25, 1.0, 1.0]  # Swing feel
            ],
            RiffStyle.METAL: [
                [0.25, 0.25, 0.25, 0.25, 1.0, 1.0],  # Fast sixteenths
                [0.5, 0.5, 0.5, 0.5, 1.0]
            ],
            RiffStyle.FUNK: [
                [0.25, 0.25, 0.5, 0.25, 0.25, 0.5],  # Syncopated
                [0.5, 0.25, 0.25, 0.5, 0.5]
            ]
        }
    
    def generate(self, style: str = 'rock', tempo: int = 120, 
                key: str = 'C', duration: int = 8) -> Dict:
        """Generate a riff with given parameters"""
        
        # Parse parameters
        riff_style = RiffStyle(style.lower())
        config = RiffConfig(
            style=riff_style,
            tempo=tempo,
            key=key,
            time_signature=TimeSignature.FOUR_FOUR,
            duration_bars=duration,
            complexity=0.7
        )
        
        # Generate the riff
        notes = self._generate_notes(config)
        
        # Convert to serializable format
        riff_data = {
            'notes': [
                {
                    'pitch': note.pitch,
                    'velocity': note.velocity,
                    'start_time': note.start_time,
                    'duration': note.duration,
                    'string': note.string,
                    'fret': note.fret
                }
                for note in notes
            ],
            'config': {
                'style': style,
                'tempo': tempo,
                'key': key,
                'duration_bars': duration,
                'time_signature': '4/4'
            },
            'metadata': {
                'generated_at': self._get_timestamp(),
                'note_count': len(notes),
                'total_duration': max(note.start_time + note.duration for note in notes) if notes else 0
            }
        }
        
        return riff_data
    
    def _generate_notes(self, config: RiffConfig) -> List[Note]:
        """Generate notes based on configuration"""
        notes = []
        
        # Get scale for the key
        scale = self._get_scale_for_style(config.style)
        root_note = self._get_root_note(config.key)
        scale_notes = [(root_note + interval) % 12 + 60 for interval in scale]  # Start from middle C octave
        
        # Get rhythm pattern
        rhythm_patterns = self.rhythm_patterns.get(config.style, self.rhythm_patterns[RiffStyle.ROCK])
        rhythm = random.choice(rhythm_patterns)
        
        current_time = 0.0
        beats_per_bar = config.time_signature.value[0]
        total_beats = config.duration_bars * beats_per_bar
        
        while current_time < total_beats:
            # Choose note duration from rhythm pattern
            duration = random.choice(rhythm)
            
            # Don't exceed total duration
            if current_time + duration > total_beats:
                duration = total_beats - current_time
            
            # Choose pitch based on style and harmony
            pitch = self._choose_pitch(scale_notes, config.style, current_time, config.duration_bars)
            
            # Choose velocity based on style
            velocity = self._choose_velocity(config.style, current_time)
            
            # Add some rests for musical breathing
            if random.random() < 0.2:  # 20% chance of rest
                current_time += duration
                continue
            
            # Create note
            note = Note(
                pitch=pitch,
                velocity=velocity,
                start_time=current_time,
                duration=duration * 0.9,  # Slight gap between notes
                string=self._get_guitar_string(pitch),
                fret=self._get_guitar_fret(pitch)
            )
            
            notes.append(note)
            current_time += duration
        
        return notes
    
    def _get_scale_for_style(self, style: RiffStyle) -> List[int]:
        """Get appropriate scale for the style"""
        scale_map = {
            RiffStyle.ROCK: self.scales['pentatonic_minor'],
            RiffStyle.BLUES: self.scales['blues'],
            RiffStyle.METAL: self.scales['minor'],
            RiffStyle.FUNK: self.scales['pentatonic_minor'],
            RiffStyle.JAZZ: self.scales['dorian'],
            RiffStyle.ACOUSTIC: self.scales['major']
        }
        return scale_map.get(style, self.scales['pentatonic_minor'])
    
    def _get_root_note(self, key: str) -> int:
        """Convert key string to MIDI note number"""
        note_map = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
            'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        }
        return note_map.get(key, 0)
    
    def _choose_pitch(self, scale_notes: List[int], style: RiffStyle, 
                     current_time: float, duration_bars: int) -> int:
        """Choose pitch based on musical context"""
        # Simple approach: weighted random from scale
        # More advanced: consider harmony, previous notes, etc.
        
        # Favor lower notes for bass-heavy styles
        if style in [RiffStyle.METAL, RiffStyle.ROCK]:
            weights = [3, 2, 2, 1, 1, 1, 1][:len(scale_notes)]
        else:
            weights = [1] * len(scale_notes)
        
        # Normalize weights
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]
        
        return np.random.choice(scale_notes, p=weights)
    
    def _choose_velocity(self, style: RiffStyle, current_time: float) -> int:
        """Choose note velocity based on style"""
        base_velocity = {
            RiffStyle.ROCK: 90,
            RiffStyle.BLUES: 75,
            RiffStyle.METAL: 100,
            RiffStyle.FUNK: 85,
            RiffStyle.JAZZ: 70,
            RiffStyle.ACOUSTIC: 65
        }.get(style, 80)
        
        # Add some variation
        variation = random.randint(-15, 15)
        return max(20, min(127, base_velocity + variation))
    
    def _get_guitar_string(self, pitch: int) -> int:
        """Get guitar string for given pitch (1-6, low E to high E)"""
        # Simplified guitar mapping
        if pitch < 45:
            return 6  # Low E string
        elif pitch < 50:
            return 5  # A string
        elif pitch < 55:
            return 4  # D string
        elif pitch < 60:
            return 3  # G string
        elif pitch < 65:
            return 2  # B string
        else:
            return 1  # High E string
    
    def _get_guitar_fret(self, pitch: int) -> int:
        """Get approximate fret position for guitar"""
        # Very simplified - assumes standard tuning
        # Real implementation would consider string and optimize fingering
        return min(24, max(0, pitch - 40))
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def get_available_styles(self) -> List[str]:
        """Get list of available riff styles"""
        return [style.value for style in RiffStyle]
    
    def export(self, riff_data: Dict, format: str) -> str:
        """Export riff to specified format"""
        # Placeholder for export functionality
        # Would implement MIDI, WAV, MP3 export here
        
        if format == 'midi':
            return self._export_midi(riff_data)
        elif format == 'json':
            return self._export_json(riff_data)
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def _export_midi(self, riff_data: Dict) -> str:
        """Export to MIDI file"""
        # Would use libraries like mido or music21
        temp_file = tempfile.NamedTemporaryFile(suffix='.mid', delete=False)
        # ... MIDI generation logic ...
        return temp_file.name
    
    def _export_json(self, riff_data: Dict) -> str:
        """Export to JSON file"""
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(riff_data, temp_file, indent=2)
        temp_file.close()
        return temp_file.name