import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Picker } from '@react-native-picker/picker';
import Checkbox from 'expo-checkbox';

import { usePlaces } from '../../../hooks/usePlaces';
import { useSports } from '../../../hooks/useSports';
import { useUserStats } from '../../../hooks/useUserStats';
import { getDistanceInMeters } from '../../../utils/distance';
import { calculateCombinationReward } from '../../../utils/rewardMath';
import { Place } from '../../../types/place';
import { useVisits } from '../../../hooks/useVisits';

const VISIT_RADIUS = parseInt(process.env.EXPO_PUBLIC_VISIT_RADIUS_METERS || '50', 10);

export default function MapScreen() {
  const { places, loading: loadingPlaces, error } = usePlaces();
  const { sports, loading: loadingSports } = useSports();
  const { lastVisit, loading: loadingStats, refreshStats } = useUserStats();
  const { saveVisit } = useVisits();
  const [isSaving, setIsSaving] = useState(false);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [closestPlace, setClosestPlace] = useState<{ place: Place; distance: number } | null>(null);

  // Změna na undefined řeší React error
  const [selectedSportId, setSelectedSportId] = useState<number | undefined>(undefined);
  const [isCombination, setIsCombination] = useState(false);
  const [calculatedReward, setCalculatedReward] = useState<number>(0);
  
  // Stav pro schování spodního tlačítka, když je menu otevřené
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (sports.length > 0 && selectedSportId === undefined) {
      setSelectedSportId(sports[0].id);
    }
  }, [sports]);

  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;
    const startTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (newLoc) => {
          setLocation(newLoc);
          const lat = newLoc.coords.latitude;
          const lng = newLoc.coords.longitude;
          
          if (Platform.OS === 'web' && iframeRef.current) {
            iframeRef.current.contentWindow?.postMessage({ type: 'UPDATE_LOCATION', lat, lng }, '*');
          } else if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`updateUserLocation(${lat}, ${lng}); true;`);
          }
        }
      );
    };
    startTracking();
    return () => { if (locationSub) locationSub.remove(); };
  }, []);

  useEffect(() => {
    if (!location || places.length === 0) return;
    const { latitude, longitude } = location.coords;
    let minDistance = Infinity;
    let foundPlace: Place | null = null;

    places.forEach((place) => {
      const [placeLng, placeLat] = place.coordinates.coordinates;
      const distance = getDistanceInMeters(latitude, longitude, placeLat, placeLng);
      if (distance < minDistance) {
        minDistance = distance;
        foundPlace = place;
      }
    });
    if (foundPlace) setClosestPlace({ place: foundPlace, distance: minDistance });
  }, [location, places]);

  useEffect(() => {
    if (closestPlace && selectedSportId && sports.length > 0) {
      const currentSport = sports.find(s => s.id === selectedSportId);
      if (currentSport) {
        const reward = calculateCombinationReward(
          closestPlace.place,
          currentSport,
          lastVisit,
          isCombination
        );
        setCalculatedReward(reward);
      }
    }
  }, [closestPlace, selectedSportId, isCombination, sports, lastVisit]);

  const leafletHtml = useMemo(() => {
    const markersScript = places.map((p) => {
        const [lng, lat] = p.coordinates.coordinates;
        return `L.marker([${lat}, ${lng}]).addTo(map).bindPopup("<b>${p.name}</b><br>Základ: ${p.default_reward} b.");`;
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }</style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map').setView([50.293056, 14.829167], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            ${markersScript}
            
            var userMarker = null;
            function updateUserLocation(lat, lng) {
              if (!userMarker) {
                userMarker = L.circleMarker([lat, lng], { color: '#4a90e2', radius: 8, fillOpacity: 1 }).addTo(map);
                map.setView([lat, lng]);
              } else {
                userMarker.setLatLng([lat, lng]);
              }
            }
            window.addEventListener('message', function(event) {
               if(event.data && event.data.type === 'UPDATE_LOCATION') updateUserLocation(event.data.lat, event.data.lng);
            });
          </script>
        </body>
      </html>
    `;
  }, [places]); 

  const isWithinRadius = closestPlace ? closestPlace.distance <= VISIT_RADIUS : false;

  const handleVisitPress = () => {
    if (!isWithinRadius || !closestPlace) return;
    bottomSheetRef.current?.expand();
  };

  const handleSaveVisit = async () => {
    if (!closestPlace || selectedSportId === undefined) return;
    
    setIsSaving(true);
    bottomSheetRef.current?.close();

    try {
      const result = await saveVisit(closestPlace.place.id, selectedSportId, isCombination);
      
      if (result.isOffline) {
        Alert.alert('Jsi offline 📡', `Návštěva byla uložena do paměti a nahraje se, jakmile budeš na internetu. Zatím ti počítáme +${calculatedReward} bodů!`);
      } else {
        Alert.alert('Úspěch! 🎉', `Získáváš ${calculatedReward} bodů za návštěvu!`);
        // Zaktualizujeme statistiky uživatele ze serveru, aby se mu hned ukázala nová kombinace a body
        refreshStats(); 
      }
    } catch (err: any) {
      Alert.alert('Chyba', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Ztmavení pozadí za BottomSheetem
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const handleSheetChanges = useCallback((index: number) => {
    setIsSheetOpen(index >= 0);
  }, []);

  const isLoading = loadingPlaces || loadingSports || loadingStats;

  return (
    <View style={styles.container}>
      {isLoading && places.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4a90e2" /></View>
      ) : (
        <>
          {/* MAPA NA CELOU OBRAZOVKU */}
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === 'web' ? (
              <iframe ref={iframeRef} srcDoc={leafletHtml} style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <WebView ref={webViewRef} originWhitelist={['*']} source={{ html: leafletHtml }} javaScriptEnabled={true} />
            )}
          </View>

          {/* PLOVOUCÍ HORNÍ VÝBĚR SPORTU */}
          <View style={styles.topBar}>
             <Text style={styles.topBarText}>Tvůj sport:</Text>
             <View style={styles.pickerContainer}>
               {selectedSportId !== undefined && (
                 <Picker
                   selectedValue={selectedSportId}
                   onValueChange={(itemValue) => setSelectedSportId(itemValue)}
                   style={styles.picker}
                 >
                   {sports.map(s => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
                 </Picker>
               )}
             </View>
          </View>

          {/* SPODNÍ TLAČÍTKO - SCHOVÁ SE, KDYŽ VYJEDE BOTTOM SHEET */}
          {!isSheetOpen && (
            <View style={styles.bottomBarWrapper}>
              <TouchableOpacity 
                style={[styles.visitButton, isWithinRadius ? styles.visitButtonActive : styles.visitButtonInactive]}
                disabled={!isWithinRadius} onPress={handleVisitPress}>
                <Text style={styles.visitButtonText}>
                  {isWithinRadius ? '📍 Jsem tu!' : 'Jsi příliš daleko od místa'}
                </Text>
              </TouchableOpacity>
              {closestPlace && (
                <Text style={styles.debugText}>Nejblíž: {closestPlace.place.name} ({Math.round(closestPlace.distance)}m)</Text>
              )}
            </View>
          )}

          {/* BOTTOM SHEET */}
          <BottomSheet
            ref={bottomSheetRef}
            index={-1} 
            snapPoints={['55%']}
            enablePanDownToClose={true}
            backdropComponent={renderBackdrop}
            onChange={handleSheetChanges}
            backgroundStyle={{ backgroundColor: '#fff', borderRadius: 30 }}
            handleIndicatorStyle={{ backgroundColor: '#ddd', width: 50 }}
          >
            <BottomSheetView style={styles.sheetContent}>
              {closestPlace && (
                <>
                  <Text style={styles.sheetTitle}>{closestPlace.place.name}</Text>
                  
                  <View style={styles.rewardBox}>
                    <Text style={styles.rewardValue}>+{calculatedReward}</Text>
                    <Text style={styles.rewardLabel}>Bodů</Text>
                  </View>

                  {/* KOMBINAČNÍ CHECKBOX SE ZOBRAZÍ JEN KDYŽ EXISTUJE HISTORIE */}
                  {lastVisit && (
                    <View style={styles.checkboxContainer}>
                      <Checkbox
                        value={isCombination}
                        onValueChange={setIsCombination}
                        color={isCombination ? '#4caf50' : undefined}
                        style={styles.checkbox}
                      />
                      <View style={styles.checkboxTextContainer}>
                        <Text style={styles.checkboxLabel}>Je to kombinace?</Text>
                        <Text style={styles.checkboxSubLabel} numberOfLines={2}>
                          S naposledy navštíveným: {lastVisit.place.name}
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveVisit}>
                    <Text style={styles.saveButtonText}>Uložit návštěvu</Text>
                  </TouchableOpacity>
                </>
              )}
            </BottomSheetView>
          </BottomSheet>
        </>
      )}

      {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Plovoucí top bar
  topBar: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.95)', padding: 10, borderRadius: 25, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  topBarText: { fontWeight: 'bold', marginLeft: 10, marginRight: 10, color: '#333' },
  pickerContainer: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, overflow: 'hidden', height: 40, justifyContent: 'center' },
  picker: { height: 40, backgroundColor: 'transparent' },

  // Plovoucí bottom bar
  bottomBarWrapper: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20, left: 20, right: 20, zIndex: 10 },
  visitButton: { height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 8 },
  visitButtonActive: { backgroundColor: '#4caf50' },
  visitButtonInactive: { backgroundColor: '#aaa' },
  visitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' },
  debugText: { textAlign: 'center', marginTop: 10, color: '#444', fontSize: 12, fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, overflow: 'hidden', alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 2 },

  // Bottom Sheet
  sheetContent: { flex: 1, padding: 25, alignItems: 'center' },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: '#111', marginBottom: 20, textAlign: 'center' },
  
  rewardBox: { backgroundColor: '#e8f5e9', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 20, alignItems: 'center', marginBottom: 25 },
  rewardValue: { fontSize: 48, fontWeight: '900', color: '#4caf50' },
  rewardLabel: { fontSize: 14, color: '#2e7d32', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: '#eee' },
  checkbox: { width: 24, height: 24, marginRight: 15, borderRadius: 6 },
  checkboxTextContainer: { flex: 1 },
  checkboxLabel: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  checkboxSubLabel: { fontSize: 13, color: '#666', marginTop: 4 },

  saveButton: { backgroundColor: '#4a90e2', width: '100%', height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#4a90e2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  errorBanner: { position: 'absolute', top: 100, left: 20, right: 20, backgroundColor: '#ff4d4f', padding: 10, borderRadius: 8 },
  errorText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});