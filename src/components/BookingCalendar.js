import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../styles/commonStyles';
import { Ionicons } from '@expo/vector-icons';

/**
 * BookingCalendar - internal monthly calendar view
 * Props:
 *  bookings: Array<{ id, date (ISO), status }>
 *  onSelectDate(dateISO, dayBookings)
 */
export default function BookingCalendar({ bookings = [], onSelectDate }) {
  const [monthCursor, setMonthCursor] = useState(new Date());

  // Group bookings by YYYY-MM-DD
  const grouped = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!b.date) return;
      const d = new Date(b.date);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().substring(0,10); // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth(); // 0-based
  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekDay = firstDayOfMonth.getDay(); // 0=Sun
  // We'll show Monday-first; compute offset
  const leadingEmpty = (startWeekDay + 6) % 7; // converts Sunday(0)->6, Monday(1)->0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate calendar cells
  const cells = [];
  for (let i = 0; i < leadingEmpty; i++) cells.push({ empty: true, key: 'e'+i });
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const keyISO = cellDate.toISOString().substring(0,10);
    const dayBookings = grouped[keyISO] || [];
    cells.push({
      empty: false,
      day,
      iso: keyISO,
      bookings: dayBookings
    });
  }

  const todayISO = new Date().toISOString().substring(0,10);

  const goPrev = () => setMonthCursor(new Date(year, month - 1, 1));
  const goNext = () => setMonthCursor(new Date(year, month + 1, 1));

  const weekdayLabels = ['Ma','Ti','Ke','To','Pe','La','Su'];

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthCursor.toLocaleDateString('fi-FI',{month:'long', year:'numeric'})}</Text>
        <TouchableOpacity onPress={goNext} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {weekdayLabels.map(d => (
          <Text key={d} style={styles.weekLabel}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c, idx) => c.empty ? (
          <View key={c.key} style={styles.cellEmpty} />
        ) : (
          <TouchableOpacity
            key={c.iso}
            style={[styles.cell, c.iso === todayISO && styles.cellToday]}
            onPress={() => onSelectDate && onSelectDate(c.iso, c.bookings)}
          >
            <Text style={styles.dayNumber}>{c.day}</Text>
            {c.bookings.length > 0 && (
              <View style={styles.dotsRow}>
                {c.bookings.slice(0,3).map(b => (
                  <View key={b.id} style={[styles.dot, dotColorByStatus(b.status)]} />
                ))}
                {c.bookings.length > 3 && (
                  <Text style={styles.moreText}>+{c.bookings.length-3}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function dotColorByStatus(status) {
  switch(status) {
    case 'pending': return { backgroundColor: '#FFC107' };
    case 'confirmed':
    case 'accepted':
      return { backgroundColor: '#4CAF50' };
    case 'declined': return { backgroundColor: '#F44336' };
    case 'cancelled_by_teacher':
    case 'cancelled_by_parent':
      return { backgroundColor: '#9E9E9E' };
    default: return { backgroundColor: colors.primary };
  }
}

const styles = StyleSheet.create({
  wrapper:{},
  headerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:colors.secondary,paddingHorizontal:12,paddingVertical:8,borderRadius:10,marginBottom:10},
  navBtn:{padding:4},
  monthTitle:{color:colors.white,fontWeight:'700'},
  weekHeader:{flexDirection:'row',justifyContent:'space-between',marginBottom:4,paddingHorizontal:4},
  weekLabel:{flex:1,textAlign:'center',fontSize:12,fontWeight:'600',color:colors.textSecondary},
  grid:{flexDirection:'row',flexWrap:'wrap'},
  cell:{width:'14.2857%',aspectRatio:1,alignItems:'center',paddingTop:6},
  cellEmpty:{width:'14.2857%',aspectRatio:1},
  cellToday:{backgroundColor:'rgba(76,175,80,0.12)',borderRadius:6},
  dayNumber:{fontSize:12,fontWeight:'600',color:colors.text},
  dotsRow:{flexDirection:'row',flexWrap:'nowrap',marginTop:2,alignItems:'center'},
  dot:{width:6,height:6,borderRadius:3,marginRight:2},
  moreText:{fontSize:10,color:colors.textSecondary}
});
