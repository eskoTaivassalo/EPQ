import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/commonStyles';

export default function GradeModal({ visible, onClose, onSave, loading }) {
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    onSave({ subject: subject.trim(), score: Number(score), maxScore: Number(maxScore), notes: notes.trim() });
    setSubject('');
    setScore('');
    setMaxScore('');
    setNotes('');
  };

  const disabled = !subject.trim() || !score || !maxScore;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Lisää koearvosana</Text>
          <TextInput
            style={styles.input}
            placeholder="Aine / koe"
            value={subject}
            onChangeText={setSubject}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Pisteet"
              value={score}
              onChangeText={setScore}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Max"
              value={maxScore}
              onChangeText={setMaxScore}
              keyboardType="numeric"
            />
          </View>
          <TextInput
            style={[styles.input, styles.notes]}
            placeholder="Muistiinpanot (valinnainen)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose} disabled={loading}>
              <Text style={styles.btnText}>Peruuta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.save]} onPress={handleSave} disabled={loading || disabled}>
              <Text style={styles.btnText}>{loading ? 'Tallennetaan...' : 'Tallenna'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding:20 },
  container: { backgroundColor: colors.white, borderRadius:14, padding:20 },
  title: { fontSize:18, fontWeight:'700', marginBottom:12, color: colors.text },
  input: { backgroundColor: colors.background, borderRadius:8, padding:12, borderWidth:1, borderColor: colors.border, marginBottom:12 },
  row: { flexDirection:'row', justifyContent:'space-between' },
  half: { flex:0.48 },
  notes: { minHeight:90, textAlignVertical:'top' },
  actions: { flexDirection:'row', justifyContent:'flex-end', marginTop:4 },
  btn: { paddingVertical:10, paddingHorizontal:18, borderRadius:8, marginLeft:10 },
  cancel: { backgroundColor: colors.textSecondary },
  save: { backgroundColor: colors.primary },
  btnText: { color: colors.white, fontWeight:'600' }
});
