"""
Flask backend for RiffGenerator application
Provides API endpoints for audio processing and MIDI generation
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import logging

from riffGenerator import RiffGenerator
from wavToMidi import WavToMidiConverter

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for React Native frontend

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'aiff'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize processors
riff_generator = RiffGenerator()
wav_to_midi = WavToMidiConverter()


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'RiffGenerator API is running'
    })


@app.route('/api/generate-riff', methods=['POST'])
def generate_riff():
    """Generate a new riff based on parameters"""
    try:
        data = request.get_json()
        
        # Extract parameters
        style = data.get('style', 'rock')
        tempo = data.get('tempo', 120)
        key = data.get('key', 'C')
        duration = data.get('duration', 8)  # bars
        
        # Generate riff
        riff_data = riff_generator.generate(
            style=style,
            tempo=tempo,
            key=key,
            duration=duration
        )
        
        return jsonify({
            'success': True,
            'riff': riff_data,
            'message': 'Riff generated successfully'
        })
        
    except Exception as e:
        logger.error(f"Error generating riff: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/convert-audio', methods=['POST'])
def convert_audio_to_midi():
    """Convert uploaded audio file to MIDI"""
    try:
        # Check if file was uploaded
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        file = request.files['audio']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Supported: {ALLOWED_EXTENSIONS}'
            }), 400
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Convert to MIDI
        midi_data = wav_to_midi.convert(filepath)
        
        # Clean up uploaded file
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'midi': midi_data,
            'message': 'Audio converted to MIDI successfully'
        })
        
    except Exception as e:
        logger.error(f"Error converting audio: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/styles', methods=['GET'])
def get_available_styles():
    """Get list of available riff styles"""
    styles = riff_generator.get_available_styles()
    return jsonify({
        'success': True,
        'styles': styles
    })


@app.route('/api/export/<format>', methods=['POST'])
def export_riff(format):
    """Export riff in specified format (midi, wav, mp3)"""
    try:
        data = request.get_json()
        riff_data = data.get('riff')
        
        if not riff_data:
            return jsonify({
                'success': False,
                'error': 'No riff data provided'
            }), 400
        
        # Export riff
        export_path = riff_generator.export(riff_data, format)
        
        return send_file(
            export_path,
            as_attachment=True,
            download_name=f'riff.{format}'
        )
        
    except Exception as e:
        logger.error(f"Error exporting riff: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)