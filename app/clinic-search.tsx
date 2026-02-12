// Helper: format working hours object or string for display
function formatWorkingHours(working_hours: any): string {
  if (!working_hours) return '';
  if (typeof working_hours === 'string') return working_hours;
  if (typeof working_hours === 'object') {
    // Format as "Mon: 9-5, Wed: 10-6" etc.
    return Object.entries(working_hours)
      .map(([day, hours]) => `${capitalize(day)}: ${hours}`)
      .join(', ');
  }
  return '';
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

const cities = [
  'Cairo', 'Giza', 'Alexandria', 'Port Said', 'Suez', 'Luxor', 'Aswan', 'Mansoura', 'Tanta', 'Zagazig', 'Ismailia', 'Faiyum', 'Sohag', 'Damietta', 'Beni Suef', 'Minya', 'Assiut', 'Hurghada', 'Sharm El Sheikh', 'Marsa Matrouh', 'El Mahalla El Kubra', 'Banha', 'Kafr El Sheikh', 'Damanhur', 'Qena'
];

// Helper: translate arbitrary text using LibreTranslate API
async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (sourceLang === targetLang) return text;
  try {
    const res = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' })
    });
    const data = await res.json();
    return data.translatedText || text;
  } catch {
    return text;
  }
}

type Clinic = {
  id: string;
  name: string;
  city: string;
  description?: string;
  [key: string]: any;
};

const ClinicCardSkeleton = () => {
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

export default function ClinicSearchScreen() {
  const { openMenu } = useHamburgerMenu();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [cityModal, setCityModal] = useState(false);
  const [results, setResults] = useState<Clinic[]>([]);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [descTranslations, setDescTranslations] = useState<{
    [key: string]: { desc?: string; address?: string }
  }>({});
  const lang = i18n.locale;
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortService, setSortService] = useState('spa');
  const [minPrices, setMinPrices] = useState<Record<string, string>>({});
  const [maxPrices, setMaxPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  // Dropdown and sort modal state (moved to top)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const favoriteAnims = useRef(new Map<string, Animated.Value>()).current;
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);


  // Fetch all clinics on mount
  React.useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const clinicsRef = collection(db, 'clinics');
        const querySnapshot = await getDocs(clinicsRef);
        const clinics = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Clinic[];
        setAllClinics(clinics);
        setResults(clinics); // Show all clinics by default
      } catch (err) {
        console.error('❌ Failed to load all clinics:', err);
        setAllClinics([]);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem('clinicFavorites');
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }
      } catch (e) {
        console.error("Failed to load favorites", e);
      }
    };
    loadFavorites();
  }, []);

  // Always translate to the current language, unless it's English
  React.useEffect(() => {
    if (lang === 'en') {
      setDescTranslations({});
      return;
    }
    const translateAll = async () => {
      const translations: { [key: string]: { desc?: string; address?: string; doctors?: any[] } } = {};
      for (const clinic of results) {
        const desc = clinic.description || '';
        const addr = clinic.address || '';
        let translatedDesc = desc;
        let translatedAddr = addr;
        // Translate description and address if needed
        if (lang !== 'en') {
          try {
            const resDesc = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(desc)}`);
            const dataDesc = await resDesc.json();
            translatedDesc = Array.isArray(dataDesc) ? dataDesc[0].map((d: any) => d[0]).join('') : desc;
          } catch {}
          try {
            const resAddr = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=${encodeURIComponent(addr)}`);
            const dataAddr = await resAddr.json();
            translatedAddr = Array.isArray(dataAddr) ? dataAddr[0].map((d: any) => d[0]).join('') : addr;
          } catch {}
        }
        // Translate doctors' descriptions if present
        let translatedDocs = undefined;
        if (Array.isArray(clinic.doctors)) {
          translatedDocs = await Promise.all(
            clinic.doctors.map(async (doc: any) => ({
              ...doc,
              description: doc.description
                ? await translateText(doc.description, 'en', lang)
                : '',
            }))
          );
        }
        translations[clinic.id] = {
          desc: translatedDesc,
          address: translatedAddr,
          ...(translatedDocs ? { doctors: translatedDocs } : {}),
        };
      }
      setDescTranslations(translations);
    };
    translateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, lang]);


const handleSearch = () => {
  // If no filters, show all clinics
  if (!search && !city && selectedServices.length === 0 && Object.keys(minPrices).length === 0 && Object.keys(maxPrices).length === 0) {
    setResults(allClinics);
    return;
  }
  fetchClinics();
};

const handleClearFilters = () => {
  setSearch('');
  setCity('');
  setSelectedServices([]);
  setMinPrices({});
  setMaxPrices({});
  setShowFavoritesOnly(false);
  setSortService('spa'); // Reset to default
  setResults(allClinics);
};

const getFavoriteAnimation = (clinicId: string) => {
  if (!favoriteAnims.has(clinicId)) {
    favoriteAnims.set(clinicId, new Animated.Value(1));
  }
  return favoriteAnims.get(clinicId)!;
};

const toggleFavorite = async (clinicId: string) => {
  const newFavorites = favorites.includes(clinicId)
    ? favorites.filter((id) => id !== clinicId)
    : [...favorites, clinicId];
  setFavorites(newFavorites);
  await AsyncStorage.setItem('clinicFavorites', JSON.stringify(newFavorites));

  const anim = getFavoriteAnimation(clinicId);
  Animated.sequence([
    Animated.timing(anim, { toValue: 1.5, duration: 150, useNativeDriver: true }),
    Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
  ]).start();
};
const fetchClinics = async () => {
  try {
      setLoading(true);
    
    // Build Firestore query
    let q: any = collection(db, 'clinics');
    const constraints: any[] = [];

    // Filter by city
    if (city) {
      constraints.push(where('city', '==', city));
    }

    // Filter by search name (client-side filtering for text search)
    // Note: Firestore doesn't support full-text search, so we'll filter client-side
    
    // Get all clinics first, then filter client-side
    const querySnapshot = await getDocs(q);
    let clinics = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Clinic[];

    // Client-side filtering
    if (search) {
      const searchLower = search.toLowerCase();
      clinics = clinics.filter(clinic => 
        clinic.clinicName?.toLowerCase().includes(searchLower) ||
        clinic.name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by selected services
    if (selectedServices.length > 0) {
      clinics = clinics.filter(clinic => {
        const clinicServices = clinic.services || {};
        return selectedServices.some(service => 
          clinicServices[service]?.selected === true
        );
      });
    }

    // Filter by price range (if specified)
    if (Object.keys(minPrices).length > 0 || Object.keys(maxPrices).length > 0) {
      clinics = clinics.filter(clinic => {
        const clinicServices = clinic.services || {};
        for (const service of selectedServices) {
          const serviceData = clinicServices[service];
          if (serviceData?.selected) {
            const fee = parseFloat(serviceData.fee || '0');
            const minPrice = minPrices[service] ? parseFloat(minPrices[service]) : 0;
            const maxPrice = maxPrices[service] ? parseFloat(maxPrices[service]) : Infinity;
            if (fee < minPrice || fee > maxPrice) {
              return false;
            }
          }
        }
        return true;
    });
    }

    // Sorting
    if (sortService === 'price_asc') {
      clinics.sort((a, b) => {
        const aFee = parseFloat(a.services?.[selectedServices[0]]?.fee || '0');
        const bFee = parseFloat(b.services?.[selectedServices[0]]?.fee || '0');
        return aFee - bFee;
      });
    } else if (sortService === 'price_desc') {
      clinics.sort((a, b) => {
        const aFee = parseFloat(a.services?.[selectedServices[0]]?.fee || '0');
        const bFee = parseFloat(b.services?.[selectedServices[0]]?.fee || '0');
        return bFee - aFee;
      });
    }

    setResults(clinics);
  } catch (err) {
    console.error('❌ Failed to load clinics:', err);
    setResults([]);
  } finally {
    setLoading(false);
  }
};


  const handleShowModal = (item: any) => {
    setSelectedClinic(item);
    setModalVisible(true);
  };

  const displayedResults = React.useMemo(() => {
    if (showFavoritesOnly) {
      return results.filter(clinic => favorites.includes(clinic.id));
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
          <Text style={styles.titleText}>{i18n.t('clinicSearch') || 'Clinic Search'}</Text>
        </View>
      </View>
      {/* Main FlatList with header for filter/sort UI */}
      {/* Filter Dropdown Content (absolute, professional card, scrollable, OVERLAYS cards) */}
      {dropdownOpen && (
        <View style={{
          position: 'absolute',
          top: 170,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderRadius: 22,
          padding: 0,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 20,
          zIndex: 2000,
          maxHeight: 420,
          marginHorizontal: 24,
          alignSelf: 'center',
        }}>
          <ScrollView style={{ padding: 24 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {/* Clinic Name */}
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{i18n.t('clinicName') || 'Clinic Name'}</Text>
            <TextInput
              style={[styles.pillInput, { marginBottom: 16 }]}
              placeholder={i18n.t('clinicNamePlaceholder')}
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#888"
            />
            {/* City Picker */}
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{i18n.t('city') || 'City'}</Text>
            <TouchableOpacity style={[styles.pillInput, { marginBottom: 16 }]} onPress={() => setCityModal(true)}>
              <Text style={{ color: city ? '#000' : '#888', fontSize: 18 }}>
                {city ? (i18n.t('city_' + city) !== 'city_' + city ? i18n.t('city_' + city) : city) : i18n.t('cityPlaceholder')}
              </Text>
            </TouchableOpacity>
            {/* Services Multi-select */}
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>{i18n.t('selectServices') || 'Select Services'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 6 }}>
              {['spa', 'sauna', 'physio', 'ice_bath', 'massage', 'full_recovery', 'nutrition', 'rehab', 'stretching', 'other'].map(service => (
                <TouchableOpacity
                  key={service}
                  onPress={() => {
                    setSelectedServices(prev =>
                      prev.includes(service)
                        ? prev.filter(s => s !== service)
                        : [...prev, service]
                    );
                  }}
                  style={{
                    backgroundColor: selectedServices.includes(service) ? '#1abc9c' : '#eee',
                    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, marginBottom: 6, marginRight: 6, minWidth: 80, alignItems: 'center', borderWidth: selectedServices.includes(service) ? 2 : 1, borderColor: selectedServices.includes(service) ? '#1abc9c' : '#ccc'
                  }}
                >
                  <Text style={{ color: selectedServices.includes(service) ? '#fff' : '#333', fontWeight: 'bold' }}>{i18n.t(service)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Fee Ranges for selected services */}
            {selectedServices.map((service) => (
              <View key={service} style={{ marginBottom: 14 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{i18n.t(service)} {i18n.t('feeRange') || 'Fee Range'}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    placeholder={i18n.t('min') || 'Min'}
                    value={minPrices[service] || ''}
                    onChangeText={(text) =>
                      setMinPrices((prev) => ({ ...prev, [service]: text }))
                    }
                    keyboardType="numeric"
                    style={{ flex: 1, borderBottomWidth: 1, borderColor: '#ccc', marginRight: 8, backgroundColor: '#f8f8f8', borderRadius: 8, padding: 8 }}
                  />
                  <TextInput
                    placeholder={i18n.t('max') || 'Max'}
                    value={maxPrices[service] || ''}
                    onChangeText={(text) =>
                      setMaxPrices((prev) => ({ ...prev, [service]: text }))
                    }
                    keyboardType="numeric"
                    style={{ flex: 1, borderBottomWidth: 1, borderColor: '#ccc', backgroundColor: '#f8f8f8', borderRadius: 8, padding: 8 }}
                  />
                </View>
              </View>
            ))}
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
      <FlatList
        data={loading ? [] : displayedResults}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={{ backgroundColor: '#000' }}>
            {/* Professional filter dropdown and sort button layout */}
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
              {/* Sort Button */}
              <TouchableOpacity
                style={{ backgroundColor: '#000', borderRadius: 28, paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', minHeight: 56, minWidth: 80, elevation: 2 }}
                onPress={() => setSortModalOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{i18n.t('sort') || 'Sort'}</Text>
                <Text style={{ color: '#fff', fontSize: 18 }}>⇅</Text>
              </TouchableOpacity>
            </View>
            {/* Sort Modal */}
            <Modal visible={sortModalOpen} transparent animationType="fade">
              <Pressable style={styles.modalOverlay} onPress={() => setSortModalOpen(false)} />
              <View style={[styles.modalBox, { maxWidth: 340, alignSelf: 'center', top: 180, backgroundColor: '#fff', borderRadius: 22, padding: 0 }]}> 
                <ScrollView style={{ padding: 24, maxHeight: 320 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18, color: '#000' }}>{i18n.t('sortBy') || 'Sort By'}</Text>
                  {/* Sort by price, near me, rating, etc. */}
                  <TouchableOpacity
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setSortService('price_asc');
                      setSortModalOpen(false);
                      handleSearch();
                    }}
                  >
                    <Text style={{ fontSize: 17, color: sortService === 'price_asc' ? '#1abc9c' : '#000', fontWeight: sortService === 'price_asc' ? 'bold' : 'normal' }}>{i18n.t('sort_price_asc')}</Text>
                    {sortService === 'price_asc' && <Text style={{ marginLeft: 8, color: '#1abc9c' }}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setSortService('price_desc');
                      setSortModalOpen(false);
                      handleSearch();
                    }}
                  >
                    <Text style={{ fontSize: 17, color: sortService === 'price_desc' ? '#1abc9c' : '#000', fontWeight: sortService === 'price_desc' ? 'bold' : 'normal' }}>{i18n.t('sort_price_desc')}</Text>
                    {sortService === 'price_desc' && <Text style={{ marginLeft: 8, color: '#1abc9c' }}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setSortService('near_me');
                      setSortModalOpen(false);
                      handleSearch();
                    }}
                  >
                    <Text style={{ fontSize: 17, color: sortService === 'near_me' ? '#1abc9c' : '#000', fontWeight: sortService === 'near_me' ? 'bold' : 'normal' }}>{i18n.t('sort_near_me') || 'Near Me'}</Text>
                    {sortService === 'near_me' && <Text style={{ marginLeft: 8, color: '#1abc9c' }}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setSortService('rating_desc');
                      setSortModalOpen(false);
                      handleSearch();
                    }}
                  >
                    <Text style={{ fontSize: 17, color: sortService === 'rating_desc' ? '#1abc9c' : '#000', fontWeight: sortService === 'rating_desc' ? 'bold' : 'normal' }}>{i18n.t('sort_rating_desc')}</Text>
                    {sortService === 'rating_desc' && <Text style={{ marginLeft: 8, color: '#1abc9c' }}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      setSortService('rating_asc');
                      setSortModalOpen(false);
                      handleSearch();
                    }}
                  >
                    <Text style={{ fontSize: 17, color: sortService === 'rating_asc' ? '#1abc9c' : '#000', fontWeight: sortService === 'rating_asc' ? 'bold' : 'normal' }}>{i18n.t('sort_rating_asc')}</Text>
                    {sortService === 'rating_asc' && <Text style={{ marginLeft: 8, color: '#1abc9c' }}>✓</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </Modal>
            <Modal visible={cityModal} transparent animationType="fade">
              <Pressable style={styles.modalOverlay} onPress={() => setCityModal(false)} />
              <View style={styles.modalBox}>
                <ScrollView>
                  {cities.map(c => (
                    <TouchableOpacity key={c} style={styles.modalItem} onPress={() => { setCity(c); setCityModal(false); }}>
                      <Text style={{ color: '#000', fontSize: 18 }}>
                        {(() => {
                          const cityKey = 'city_' + c.replace(/\s+/g, '');
                          const translation = i18n.t(cityKey);
                          return translation !== cityKey ? translation : c;
                        })()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Modal>
          </View>
        }
        renderItem={({ item }) => {
          let desc = item.description;
          if (lang !== 'en') {
            desc = typeof descTranslations[item.id]?.desc === 'string'
              ? descTranslations[item.id]?.desc
              : item.description;
          }
          return (
            <TouchableOpacity onPress={() => handleShowModal(item)}>
              <View style={[styles.card, styles.cardBlack, { maxWidth: 340, width: '95%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', padding: 12 }]}> 
                {/* Profile Photo */}
                {item.profile_photo ? (
                  <Image source={{ uri: item.profile_photo }} style={{ width: 54, height: 54, borderRadius: 27, marginRight: 14, backgroundColor: '#eee', borderWidth: 1, borderColor: '#fff' }} />
                ) : (
                  <Image source={require('../assets/logo.png')} style={{ width: 54, height: 54, borderRadius: 27, marginRight: 14, backgroundColor: '#eee', borderWidth: 1, borderColor: '#fff', tintColor: '#fff', opacity: 0.7 }} />
                )}
                <TouchableOpacity
                  style={{ position: 'absolute', top: -4, right: -4, zIndex: 1, padding: 8 }}
                  onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                >
                  <Animated.Text style={{ fontSize: 28, color: favorites.includes(item.id) ? '#ffd700' : '#aaa', transform: [{ scale: getFavoriteAnimation(item.id) }] }}>
                    ★
                  </Animated.Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  {/* ✅ Clinic Name (not translated) */}
                  <Text style={[styles.cardTitle, { color: '#fff' }]}>{item.clinic_name || item.name}</Text>
                  {/* ✅ Translated City */}
                  <Text style={[styles.cardCity, { color: '#bbb' }]}>
                    {(() => {
                      const cityKey = 'city_' + item.city.replace(/\s+/g, '');
                      const translation = i18n.t(cityKey);
                      return translation !== cityKey ? translation : item.city;
                    })()}
                  </Text>
                  {/* ✅ Address (translated if available) */}
                  {item.address ? (
                    <Text style={{ color: '#ccc', marginTop: 2 }}>
                      {lang !== 'en'
                        ? (descTranslations[item.id]?.address !== undefined
                            ? descTranslations[item.id]?.address
                            : '')
                        : item.address}
                    </Text>
                  ) : null}
                  {item.doctors && Array.isArray(item.doctors) && item.doctors.length > 0 && (
  <Text style={{ color: '#ccc', marginTop: 2 }}>
    {i18n.t('doctor')}: {item.doctors[0].name}
  </Text>
)}

                  {/* ✅ Description (translated if available) */}
                  {desc ? (
                    <Text style={[styles.cardDesc, { color: '#eee' }]} numberOfLines={2} ellipsizeMode="tail">{desc}</Text>
                  ) : null}
                  {/* Working hours removed from card as requested (double check: nothing rendered here) */}
                  {/* ✅ Translated Services with Fees */}
                  <View style={{ marginTop: 4 }}>
                    {Object.keys(item).map((key) => {
                      if (key.endsWith('_fee') && item[key]) {
                        const service = key.replace('_fee', '');
                        return (
                          <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#eee', fontSize: 13 }}>
                              {i18n.t(service) !== service ? i18n.t(service) : service}
                            </Text>
                            <Text style={{ color: '#eee', fontSize: 13 }}>{item[key]} EGP</Text>
                          </View>
                        );
                      }
                      return null;
                    })}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 20 }}>
              <ClinicCardSkeleton />
              <ClinicCardSkeleton />
              <ClinicCardSkeleton />
            </View>
          ) : (
            <Text style={styles.empty}>{i18n.t('noResults')}</Text>
          )
        }
        style={{ marginTop: 0 }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      {/* Modal for summary/details with fade transition */}
      <Modal visible={modalVisible} animationType="none" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: '#000', borderRadius: 20, padding: 24, maxHeight: 520 }]}> 
            {selectedClinic && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  {selectedClinic.profile_photo ? (
                    <Image source={{ uri: selectedClinic.profile_photo }} style={{ width: 70, height: 70, borderRadius: 35, marginBottom: 8, backgroundColor: '#eee', borderWidth: 2, borderColor: '#fff' }} />
                  ) : (
                    <Image source={require('../assets/logo.png')} style={{ width: 70, height: 70, borderRadius: 35, marginBottom: 8, backgroundColor: '#eee', borderWidth: 2, borderColor: '#fff', tintColor: '#fff', opacity: 0.7 }} />
                  )}
                  <Text style={[styles.cardTitle, { color: '#fff', fontSize: 22, marginBottom: 2 }]}>{selectedClinic.clinic_name || selectedClinic.name}</Text>
                </View>
                <Text style={[styles.cardCity, { color: '#fff' }]}>
                  {(() => {
                    const cityKey = 'city_' + selectedClinic.city.replace(/\s+/g, '');
                    const translation = i18n.t(cityKey);
                    return translation !== cityKey ? translation : selectedClinic.city;
                  })()}
                </Text>
                <Text style={[styles.cardDesc, { color: '#fff', marginBottom: 12 }]}>
                  {lang !== 'en'
                    ? (typeof descTranslations[selectedClinic.id]?.desc === 'string'
                        ? descTranslations[selectedClinic.id]?.desc
                        : selectedClinic.description)
                    : selectedClinic.description}
                </Text>
               
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, marginBottom: 8 }}>{i18n.t('serviceFees') || 'Service Fees:'}</Text>
                <View style={{ width: '100%', marginBottom: 16 }}>
                  {Object.keys(selectedClinic).map((key) => {
                    if (key.endsWith('_fee') && selectedClinic[key]) {
                      const service = key.replace('_fee', '');
                      return (
                        <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 16 }}>{i18n.t(service) || service}</Text>
                          <Text style={{ color: '#fff', fontSize: 16 }}>{selectedClinic[key]} EGP</Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
                <TouchableOpacity style={styles.reserveBtn} onPress={() => {
                  setModalVisible(false);
                  router.push({ pathname: '/clinic-details', params: { clinic: JSON.stringify(selectedClinic) } });
                }}>
                  <Text style={styles.reserveBtnText}>{i18n.t('viewDetails') || 'View Details'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>{i18n.t('close') || 'Close'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    marginLeft: -44,
    paddingHorizontal: 44,
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
    textAlign: 'center',
  },
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
