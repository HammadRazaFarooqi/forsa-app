import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';



// City logic copied from agent-search
const cities = Object.entries(i18n.t('cities', { returnObjects: true }) as Record<string, string>);
const cityLabels = i18n.t('cities', { returnObjects: true }) as Record<string, string>;
const ageGroups = Array.from({ length: 10 }, (_, i) => (7 + i).toString());

import { Picker } from '@react-native-picker/picker';

export default function AcademySearchScreen() {
  const router = useRouter();
  const { openMenu } = useHamburgerMenu();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');

// Define Academy type
type Academy = {
  id: string;
  name: string;
  city: string;
  description: string;
  fees: Record<string, number>;
};

const [results, setResults] = useState<Academy[]>([]);
const [allAcademies, setAllAcademies] = useState<Academy[]>([]);
const [dropdownOpen, setDropdownOpen] = useState(false);
const [loading, setLoading] = useState(false);
const [favorites, setFavorites] = useState<string[]>([]);
const favoriteAnims = useRef(new Map<string, Animated.Value>()).current;
const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [cityModal, setCityModal] = useState(false);
const [selectedAcademy, setSelectedAcademy] = useState<Academy | null>(null);
// Show modal for selected academy
const handleShowModal = (academy: Academy) => {
  setSelectedAcademy(academy);
  setModalVisible(true);
};
  const [modalVisible, setModalVisible] = useState(false);


  useEffect(() => {
    const fetchAcademies = async () => {
    setLoading(true);
      try {
        const academiesRef = collection(db, 'academies');
        const querySnapshot = await getDocs(academiesRef);
        const academies = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().academyName || '',
          city: doc.data().city || '',
          description: doc.data().description || '',
          fees: doc.data().fees || {},
          ...doc.data()
        })) as Academy[];
        setResults(academies);
        setAllAcademies(academies);
      } catch (err) {
        console.error('❌ Failed to fetch academies:', err);
        setResults([]);
        setAllAcademies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAcademies();
    // Load favorites from local storage
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('academyFavorites');
        if (stored) setFavorites(JSON.parse(stored));
      } catch {}
    })();
  }, []);

const handleSearch = () => {
  // If no filters, show all
  if (!search && !city && !age) {
    setResults(allAcademies);
    return;
  }
  setLoading(true);
  // Client-side filtering
  const filtered = allAcademies.filter((a: Academy) =>
    (!search || a.name.toLowerCase().includes(search.toLowerCase()) || 
     (a.academyName && a.academyName.toLowerCase().includes(search.toLowerCase()))) &&
        (!city || a.city.toLowerCase() === city.toLowerCase()) &&
        (!age || (a.fees && Object.keys(a.fees).includes(age)))
      );
      setResults(filtered);
  setLoading(false);
};

const handleClearFilters = () => {
  setSearch('');
  setCity('');
  setAge('');
  setShowFavoritesOnly(false);
  setResults(allAcademies);
};

const getFavoriteAnimation = (academyId: string) => {
  if (!favoriteAnims.has(academyId)) {
    favoriteAnims.set(academyId, new Animated.Value(1));
  }
  return favoriteAnims.get(academyId)!;
};

const toggleFavorite = async (academyId: string) => {
  const newFavorites = favorites.includes(academyId)
    ? favorites.filter((id) => id !== academyId)
    : [...favorites, academyId];
  setFavorites(newFavorites);
  await AsyncStorage.setItem('academyFavorites', JSON.stringify(newFavorites));
  const anim = getFavoriteAnimation(academyId);
  Animated.sequence([
    Animated.timing(anim, { toValue: 1.5, duration: 150, useNativeDriver: true }),
    Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
  ]).start();
};


  // Skeleton loader
  const AcademyCardSkeleton = () => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }, [pulseAnim]);
    return (
      <Animated.View style={[styles.card, styles.cardBlack, { maxWidth: 340, width: '95%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', padding: 12, opacity: pulseAnim, marginBottom: 16 }]}> 
        <View style={{ width: 54, height: 54, borderRadius: 27, marginRight: 14, backgroundColor: '#333' }} />
        <View style={{ flex: 1 }}>
          <View style={{ height: 20, backgroundColor: '#333', borderRadius: 4, marginBottom: 6, width: '70%' }} />
          <View style={{ height: 16, backgroundColor: '#333', borderRadius: 4, marginBottom: 8, width: '40%' }} />
          <View style={{ height: 14, backgroundColor: '#333', borderRadius: 4, marginBottom: 4, width: '90%' }} />
          <View style={{ height: 14, backgroundColor: '#333', borderRadius: 4, width: '80%' }} />
        </View>
      </Animated.View>
    );
  };

  const displayedResults = React.useMemo(() => {
    if (showFavoritesOnly) {
      return results.filter(a => favorites.includes(a.id));
    }
    return results;
  }, [results, showFavoritesOnly, favorites]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <HamburgerMenu />
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.menuButton} onPress={openMenu} activeOpacity={0.8}>
          <View style={styles.menuButtonInner}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{i18n.t('searchAcademies')}</Text>
        </View>
      </View>
      {/* ...existing code... */}
      <FlatList
        data={loading ? [] : displayedResults}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={{ backgroundColor: '#000' }}>
            {/* Filter Dropdown and Favourites/Sort Buttons */}
            <View style={[styles.filterBoxSticky, { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 0, margin: 24, marginTop: 16 }]}> 
              {/* Filter Dropdown Button */}
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f4', borderRadius: 28, paddingVertical: 16, paddingHorizontal: 24, borderWidth: dropdownOpen ? 2 : 1, borderColor: dropdownOpen ? '#000' : '#f4f4f4', minHeight: 56, elevation: dropdownOpen ? 2 : 0 }}
                onPress={() => setDropdownOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18, color: '#000', flex: 1, fontWeight: 'bold' }}>{i18n.t('filters') || 'Filters'}</Text>
                <Text style={{ fontSize: 20, color: '#888', marginLeft: 8 }}>{dropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {/* Favorites Button */}
              <TouchableOpacity
                style={{ backgroundColor: showFavoritesOnly ? '#ffd700' : '#f4f4f4', borderRadius: 28, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 56, borderWidth: 1, borderColor: showFavoritesOnly ? '#e6c200' : '#f4f4f4' }}
                onPress={() => setShowFavoritesOnly(prev => !prev)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 24, color: showFavoritesOnly ? '#fff' : '#aaa' }}>★</Text>
              </TouchableOpacity>
            </View>
            {/* Filter Dropdown Content */}
            {dropdownOpen && (
              <View style={{
                backgroundColor: '#fff',
                borderRadius: 22,
                padding: 0,
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 20,
                zIndex: 2001,
                maxHeight: 420,
                marginHorizontal: 24,
                alignSelf: 'center',
              }}>
                <ScrollView style={{ padding: 24 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                  {/* Academy Name */}
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{i18n.t('academy_name') || 'Academy Name'}</Text>
                  <TextInput
                    style={[styles.pillInput, { marginBottom: 16 }]}
                    placeholder={i18n.t('academyNamePlaceholder')}
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor="#888"
                  />
                  {/* City Picker */}
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{i18n.t('city') || 'City'}</Text>
                  <View style={{ borderRadius: 28, backgroundColor: '#f4f4f4', marginBottom: 16 }}>
                    <Picker
                      selectedValue={city}
                      onValueChange={setCity}
                      style={{ color: '#000', fontSize: 18, width: '100%' }}
                      mode="dropdown"
                    >
                      <Picker.Item label={i18n.t('cityPlaceholder')} value="" color="#888" />
                      {cities.map(([key, label]) => (
                        <Picker.Item key={key} label={label} value={key} color="#000" />
                      ))}
                    </Picker>
                  </View>
                  {/* Age Filter */}
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{i18n.t('ageGroup') || 'Age Group'}</Text>
                  <View style={{ borderRadius: 28, backgroundColor: '#f4f4f4', marginBottom: 16 }}>
                    <Picker
                      selectedValue={age}
                      onValueChange={setAge}
                      style={{ color: '#000', fontSize: 18, width: '100%' }}
                      mode="dropdown"
                    >
                      <Picker.Item label={i18n.t('selectAgeGroup') || 'Select Age Group'} value="" color="#888" />
                      {ageGroups.map((a) => (
                        <Picker.Item key={a} label={a} value={a} color="#000" />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity style={[styles.searchBtn, { marginTop: 8 }]} onPress={() => { setDropdownOpen(false); handleSearch(); }}>
                    <Text style={styles.searchBtnText}>{i18n.t('search')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.searchBtn, { marginTop: 16, backgroundColor: '#e74c3c' }]}
                    onPress={() => { handleClearFilters(); setDropdownOpen(false); }}>
                    <Text style={styles.searchBtnText}>{i18n.t('clearFilters') || 'Clear Filters'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: '/academy-details', params: { academy: JSON.stringify(item) } })}>
            <View style={[styles.card, styles.cardBlack, { maxWidth: 340, width: '95%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', padding: 12 }]}> 
              {/* Profile Photo */}
              <Image source={require('../assets/logo.png')} style={{ width: 54, height: 54, borderRadius: 27, marginRight: 14, backgroundColor: '#eee', borderWidth: 1, borderColor: '#fff', tintColor: '#fff', opacity: 0.7 }} />
              <TouchableOpacity
                style={{ position: 'absolute', top: -4, right: -4, zIndex: 1, padding: 8 }}
                onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
              >
                <Animated.Text style={{ fontSize: 28, color: favorites.includes(item.id) ? '#ffd700' : '#aaa', transform: [{ scale: getFavoriteAnimation(item.id) }] }}>
                  ★
                </Animated.Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: '#fff' }]}>{item.name}</Text>
                <Text style={[styles.cardCity, { color: '#bbb' }]}>{cityLabels[item.city] || item.city}</Text>
                <Text style={[styles.cardDesc, { color: '#eee' }]}>{item.description}</Text>
                {/* Fees summary */}
                {item.fees && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{i18n.t('monthlyFees') || 'Monthly Fees (per age group):'}</Text>
                    {Object.entries(item.fees).map(([age, fee]) => (
                      <View key={age} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 14 }}>{age}</Text>
                        <Text style={{ color: '#fff', fontSize: 14 }}>{String(fee)} EGP</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 20 }}>
              <AcademyCardSkeleton />
              <AcademyCardSkeleton />
              <AcademyCardSkeleton />
            </View>
          ) : (
            <Text style={styles.empty}>{i18n.t('noResults')}</Text>
          )
        }
        style={{ marginTop: 0 }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      {/* Modal removed: navigation is now direct on card press */}
      <Image source={require('../assets/logo.png')} style={styles.forsaLogo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 0 },
  headerContainer: {
    backgroundColor: '#000',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    zIndex: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    zIndex: 100,
  },
  menuButtonInner: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#000',
  },
  menuLine: {
    width: 28,
    height: 4,
    backgroundColor: '#000',
    marginVertical: 3,
    borderRadius: 2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -44, // Negative margin to center title while keeping menu button on left
    paddingHorizontal: 44, // Add padding to ensure title doesn't overlap with menu
  },
  titleBar: {
    backgroundColor: '#000',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
    marginBottom: 18,
    zIndex: 10,
    width: '100%',
  },
  titleText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1,
    alignItems: 'center',
    textAlign: 'center', // Center the text horizontally
  },
  filterBox: { backgroundColor: '#fff', borderRadius: 22, padding: 24, margin: 24, marginTop: 0, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2, flexDirection: 'column', gap: 18, alignItems: 'stretch' },
  filterBoxSticky: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    margin: 24,
    marginTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'column',
    gap: 18,
    alignItems: 'stretch',
  },
  pillInput: { minWidth: 220, borderRadius: 28, backgroundColor: '#f4f4f4', paddingVertical: 18, paddingHorizontal: 28, fontSize: 20, color: '#000', borderWidth: 0, marginBottom: 0, marginTop: 0, marginHorizontal: 0 },
  searchBtn: { backgroundColor: '#000', borderRadius: 28, paddingVertical: 18, paddingHorizontal: 36, alignItems: 'center', justifyContent: 'center', marginTop: 10, minWidth: 120 },
  searchBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardBlack: { backgroundColor: '#111', borderColor: '#000', borderWidth: 1 },
  cardTitle: { fontWeight: 'bold', fontSize: 19, color: '#000', marginBottom: 4 },
  cardCity: { color: '#888', fontSize: 15, marginBottom: 2 },
  cardDesc: { color: '#222', fontSize: 15, marginTop: 4 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  modalBox: { position: 'absolute', top: 160, left: 30, right: 30, backgroundColor: '#fff', borderRadius: 14, padding: 10, maxHeight: 320, zIndex: 100, elevation: 10 },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  forsaLogo: {
    position: 'absolute',
    bottom: 18,
    left: '50%',
    transform: [{ translateX: -24 }],
    width: 48,
    height: 48,
    opacity: 0.22,
    tintColor: '#000',
    zIndex: 1,
  },
  reserveBtn: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  reserveBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 17,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
});
