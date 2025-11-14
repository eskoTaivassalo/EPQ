import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';

// Props: profile { id, displayName/name, photoURL, role, subjects?, location?, notes? }
export default function BookingParticipantCard({ profile, roleLabel, booking }) {
  if (!profile) return null;
  const name = profile.name || profile.displayName || profile.fullName || 'Nimetön';
  const avatar = profile.photoURL;
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={40} color={colors.white} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          {roleLabel && <Text style={styles.role}>{roleLabel}</Text>}
          {booking?.status && (
            <View style={styles.statusRow}>
              <Ionicons name="ellipse" size={10} color={statusColor(booking.status)} />
              <Text style={styles.statusText}>{statusText(booking.status)}</Text>
            </View>
          )}
        </View>
      </View>
      {booking?.notes ? <Text style={styles.notes}>Muistiinpanot: {booking.notes}</Text> : null}
      {booking?.cancelReason ? <Text style={styles.cancel}>Peruutuksen syy: {booking.cancelReason}</Text> : null}
    </View>
  );
}

function statusColor(status) {
  switch(status) {
    case 'pending': return '#FFC107';
    case 'confirmed': return '#4CAF50';
    case 'declined': return '#F44336';
    case 'cancelled_by_teacher':
    case 'cancelled_by_parent': return '#9E9E9E';
    default: return colors.primary;
  }
}

function statusText(status) {
  switch(status) {
    case 'pending': return 'Odottaa';
    case 'confirmed': return 'Vahvistettu';
    case 'declined': return 'Hylätty';
    case 'cancelled_by_teacher': return 'Peruutettu (opettaja)';
    case 'cancelled_by_parent': return 'Peruutettu (vanhempi)';
    default: return status;
  }
}

const styles = StyleSheet.create({
  card:{backgroundColor:colors.white,borderRadius:12,padding:12,marginBottom:12,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.08,shadowRadius:4,elevation:3},
  headerRow:{flexDirection:'row',marginBottom:8},
  avatarContainer:{width:60,height:60,borderRadius:30,backgroundColor:colors.primary,justifyContent:'center',alignItems:'center',marginRight:12,overflow:'hidden'},
  avatarImage:{width:60,height:60,borderRadius:30},
  info:{flex:1},
  name:{fontSize:18,fontWeight:'bold',color:colors.text,marginBottom:2},
  role:{fontSize:12,color:colors.textSecondary,marginBottom:4},
  statusRow:{flexDirection:'row',alignItems:'center',gap:6},
  statusText:{fontSize:12,color:colors.textSecondary,marginLeft:4},
  notes:{fontSize:12,color:colors.textSecondary,marginTop:4},
  cancel:{fontSize:12,color:'#F44336',marginTop:4,fontStyle:'italic'}
});
