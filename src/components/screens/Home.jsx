import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

function Home() {
    const [favorites, setFavorites] = useState([]);
    const [predictions, setPredictions] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [trainPredictions, setTrainPredictions] = useState({})

    useFocusEffect(
        React.useCallback(() => {
            loadFavorites();
            const interval = setInterval(fetchAllPredictions, 60000);
            return () => clearInterval(interval);
        }, [])
    );

    useEffect(() => {
        if (favorites.length > 0) {
            fetchAllPredictions();
        }
    }, [favorites]);

    const loadFavorites = async () => {
        
        try {
            const savedFavorites = await AsyncStorage.getItem('favorites');
            if (savedFavorites) {
                setFavorites(JSON.parse(savedFavorites));
                console.log(favorites)
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    };

    const removeFavorite = async (item) => {
        console.log(favorites)
        let tempFavs = favorites.filter(
            fav => !(fav.id === item.id)
        );
        setFavorites(tempFavs)
        await AsyncStorage.setItem('favorites', JSON.stringify(tempFavs))
        console.log(tempFavs)
    }

    const fetchAllPredictions = async () => {
        setIsLoading(true);
        try {
            const predictionPromises = favorites.map(favorite => {
                if (favorite.type === 'train') {
                    return fetchTrainPredictions(favorite.stopId);
                } else {
                    return fetchBusPredictions(favorite.routeNumber, favorite.stopIds);
                }
            });

            const results = await Promise.all(predictionPromises);
            
            const newPredictions = {};
            favorites.forEach((favorite, index) => {
                newPredictions[favorite.id] = results[index];
            });
            
            setPredictions(newPredictions);
        } catch (error) {
            console.error('Error fetching predictions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTrainPredictions = async (stopIds) => {
        try {
            console.log(stopIds)
            const predictionPromises = stopIds.map(async (stopId) => {
                const response = await axios.get(
                    `https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_TRAIN_API_KEY}&stpid=${stopId}&outputType=JSON`
                );
                const predictions = response.data.ctatt ? response.data.ctatt.eta : []
                const filteredPredictions = predictions.map((prediction) => ({
                    staNm: prediction.staNm,
                    
                }));
            })
            const results = await Promise.all(predictionPromises)
            console.log(results)
            
        } catch (error) {
            console.error('Error fetching train predictions:', error);
            return [];
        }
    };

    const fetchBusPredictions = async (routeNumber, stopIds) => {
        try {
            // Fetch predictions for all directions
            const predictionPromises = Object.entries(stopIds).map(async ([direction, stopId]) => {
                const response = await axios.get(
                    `http://www.ctabustracker.com/bustime/api/v2/getpredictions?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${routeNumber}&stpid=${stopId}&format=json`
                );
                
                const predictions = response.data['bustime-response'].prd || [];
                // Filter predictions for this direction
                return {
                    direction,
                    predictions: predictions.filter(pred => pred.rtdir === direction)
                };
            });

            const results = await Promise.all(predictionPromises);
            
            // Convert array of results to object with directions as keys
            const directionPredictions = {};
            results.forEach(result => {
                directionPredictions[result.direction] = result.predictions;
            });
            
            return directionPredictions;
        } catch (error) {
            console.error('Error fetching bus predictions:', error);
            return {};
        }
    };

    const renderPredictions = (item) => {
        const itemPredictions = predictions[item.id] || {};
        
        if (item.type === 'train') {
            return renderTrainPredictions(itemPredictions);
        } else {
            return renderBusPredictions(itemPredictions);
        }
    };

    const renderTrainPredictions = (trainPredictions) => (
        <View style={styles.predictionsContainer}>
            {trainPredictions.length > 0 ? (
                <>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Run</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Direction</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>ETA</Text>
                    </View>
                    
                    {trainPredictions.map((prediction, index) => {
                        const arrivalTime = new Date(prediction.arrT);
                        const currentTime = new Date();
                        const timeDiff = Math.round((arrivalTime - currentTime) / 60000);
                        const isDelayed = prediction.isDly === "1";
                        const isDue = prediction.isApp === "1" || timeDiff <= 2;
                        
                        return (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 1 }]}>
                                    {prediction.rn || "—"}
                                </Text>
                                <Text style={[styles.tableCell, { flex: 2 }]}>
                                    {prediction.destNm}
                                </Text>
                                <View style={[
                                    styles.etaContainer, 
                                    { flex: 1, justifyContent: 'flex-end' }
                                ]}>
                                    <Text style={[
                                        styles.etaText,
                                        isDelayed && styles.delayedText,
                                        isDue && styles.dueText
                                    ]}>
                                        {isDue ? "DUE" : `${timeDiff} min`}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </>
            ) : (
                <Text style={styles.noPredictions}>No predictions available</Text>
            )}
        </View>
    );

    const renderBusPredictions = (busPredictions) => (
        <View style={styles.predictionsContainer}>
            {Object.entries(busPredictions).map(([direction, predictions]) => (
                <View key={direction} style={styles.directionContainer}>
                    <Text style={styles.directionHeader}>{direction}</Text>
                    {predictions.length > 0 ? (
                        <View>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Bus</Text>
                                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>To</Text>
                                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>ETA</Text>
                            </View>
                            {predictions.map((prediction, index) => {
                                const isDelayed = prediction.dly === "1";
                                const isDue = parseInt(prediction.prdctdn) <= 2;
                                
                                return (
                                    <View key={index} style={styles.tableRow}>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>
                                            {prediction.vid}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 2 }]}>
                                            {prediction.des}
                                        </Text>
                                        <View style={[styles.etaContainer, { flex: 1 }]}>
                                            <Text style={[
                                                styles.etaText,
                                                isDelayed && styles.delayedText,
                                                isDue && styles.dueText
                                            ]}>
                                                {isDue ? "DUE" : `${prediction.prdctdn} min`}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <Text style={styles.noPredictions}>No predictions available</Text>
                    )}
                </View>
            ))}
        </View>
    );

    const renderFavorite = ({ item }) => (
        <View style={styles.favoriteCard}>
            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
            <View style={styles.favoriteInfo}>
                <View style={styles.favoriteHeader}>
                    <Text style={styles.favoriteName}>{item.name}</Text>
                    <TouchableOpacity 
                        onPress={() => removeFavorite(item)}
                        style={styles.removeButton}
                    >
                        <Ionicons name="heart" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                <View style={styles.typeContainer}>
                    <Ionicons 
                        name={item.type === 'train' ? 'train-outline' : 'bus-outline'} 
                        size={14} 
                        color="#666" 
                        style={styles.typeIcon}
                    />
                    <Text style={styles.favoriteType}>
                        {item.type === 'train' ? 'Train Station' : 'Bus Stop'}
                    </Text>
                </View>
                {renderPredictions(item)}
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyStateContainer}>
            <Ionicons name="heart-outline" size={64} color="#CCCCCC" />
            <Text style={styles.noFavorites}>No favorites added yet</Text>
            <Text style={styles.emptyStateSubtitle}>
                Add your favorite train stations and bus stops to see their arrival times here
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Favorites</Text>
                    <TouchableOpacity 
                        onPress={fetchAllPredictions} 
                        style={styles.refreshButton}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#007AFF" />
                        ) : (
                            <Ionicons name="refresh" size={24} color="#007AFF" />
                        )}
                    </TouchableOpacity>
                </View>
                
                <FlatList
                    data={favorites}
                    renderItem={renderFavorite}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    container: { 
        flex: 1, 
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    title: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: '#333333',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F0F8FF',
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        flex: 1,
        width: '100%',
    },
    listContent: {
        paddingVertical: 16,
        paddingBottom: 32,
    },
    favoriteCard: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    colorIndicator: {
        width: 8,
        height: '100%',
    },
    favoriteInfo: {
        flex: 1,
        padding: 16,
    },
    favoriteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    favoriteName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        flex: 1,
        flexWrap: 'wrap',
        paddingRight: 8,
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeIcon: {
        marginRight: 4,
    },
    favoriteType: {
        fontSize: 14,
        color: '#666666',
    },
    removeButton: {
        padding: 8,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    predictionsContainer: {
        marginTop: 8,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 12,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 8,
        marginBottom: 4,
    },
    tableHeaderCell: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666666',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    tableCell: {
        fontSize: 15,
        color: '#333333',
    },
    etaContainer: {
        flexDirection: 'row',
    },
    etaText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#666666',
    },
    delayedText: {
        color: '#FF3B30',
    },
    dueText: {
        color: '#34C759',
    },
    noPredictions: {
        fontSize: 15,
        color: '#999999',
        textAlign: 'center',
        paddingVertical: 8,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 64,
    },
    noFavorites: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666666',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: '#999999',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    directionContainer: {
        marginBottom: 16,
    },
    directionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 8,
    },
});

export default Home;
