import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/commonStyles';

export default function MessageModal({ visible, onClose, onSend, loading }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    onSend(text.trim());
    setText('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Lähetä viesti</Text>
          <TextInput
            style={styles.input}
            placeholder="Kirjoita viesti vanhemmalle..."
            value={text}
            onChangeText={setText}
            multiline
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose} disabled={loading}>
              <Text style={styles.btnText}>Peruuta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.send]} onPress={handleSend} disabled={loading || !text.trim()}>
              <Text style={styles.btnText}>{loading ? 'Lähetetään...' : 'Lähetä'}</Text>
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
  input: { minHeight:120, backgroundColor: colors.background, borderRadius:8, padding:12, textAlignVertical:'top', borderWidth:1, borderColor: colors.border },
  actions: { flexDirection:'row', justifyContent:'flex-end', marginTop:16 },
  btn: { paddingVertical:10, paddingHorizontal:18, borderRadius:8, marginLeft:10 },
  cancel: { backgroundColor: colors.textSecondary },
  send: { backgroundColor: colors.primary },
  btnText: { color: colors.white, fontWeight:'600' }
});
