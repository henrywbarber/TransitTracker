import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

function Home() {
    const [favorites, setFavorites] = useState([]);
    const [predictions, setPredictions] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [expandedItems, setExpandedItems] = useState({});

    //loads the favorites and expanded state everytime the home window is focused
    useFocusEffect(
        React.useCallback(() => {
            loadFavorites();
            loadExpandedState();
        }, []) 
    );

    //fetches predictions when home window comes into focus
    useFocusEffect(
        React.useCallback(() => {
            if (favorites.length > 0) {
                fetchAllPredictions();
            }
        }, [favorites])
    );

    //every minute fetchAllPredictions will run to prevent having to reload the page
    useEffect(() => {
        if (favorites.length > 0) {
            fetchAllPredictions();
            
            console.log('[Home] Periodic refresh triggered');
            const interval = setInterval(() => {
                console.log('[Home] Periodic refresh triggered');
                fetchAllPredictions();
            }, 60000);
            return () => clearInterval(interval); //cleanup
        }
    }, [favorites]); 

    const loadFavorites = async () => {
        try {
            const savedFavorites = await AsyncStorage.getItem('favorites');
            if (savedFavorites) {
                const parsedFavorites = JSON.parse(savedFavorites);
                setFavorites(parsedFavorites);
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    };

    const loadExpandedState = async () => {
        try {
            const savedExpandedState = await AsyncStorage.getItem('expandedItems');
            if (savedExpandedState) {
                setExpandedItems(JSON.parse(savedExpandedState));
            }
        } catch (error) {
            console.error('Error loading expanded state:', error);
        }
    };

    const saveExpandedState = async (newState) => {
        try {
            await AsyncStorage.setItem('expandedItems', JSON.stringify(newState));
        } catch (error) {
            console.error('Error saving expanded state:', error);
        }
    };

    const toggleExpanded = async (itemId) => {
        const newExpandedState = {
            ...expandedItems,
            [itemId]: !expandedItems[itemId]
        };
        setExpandedItems(newExpandedState);
        await saveExpandedState(newExpandedState);
    };

    const removeFavorite = async (item) => {
        Alert.alert(
            "Remove Favorite",
            `Are you sure you want to remove ${item.name} from your favorites?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Update AsyncStorage
                            const tempFavs = favorites.filter(
                                fav => !(fav.id === item.id)
                            );
                            await AsyncStorage.setItem('favorites', JSON.stringify(tempFavs));
                            
                            // Update state
                            setFavorites(tempFavs);
                            
                            // Remove from expanded state
                            const newExpandedState = { ...expandedItems };
                            delete newExpandedState[item.id];
                            setExpandedItems(newExpandedState);
                            await saveExpandedState(newExpandedState);
                            
                            console.log(`[Home] Removed favorite: ${item.name} (${item.type})`);
                        } catch (error) {
                            console.error('Error removing favorite:', error);
                        }
                    }
                }
            ]
        );
    };

    const fetchAllPredictions = async () => {
        setIsRefreshing(true);
        console.log(`[Home] Starting fetch for ${favorites.length} favorites`);
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
            console.log(`[Home] Successfully fetched predictions for ${favorites.length} favorites`);
        } catch (error) {
            console.error('[Home] Error fetching predictions:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const fetchTrainPredictions = async (stopIds) => {
        try {
            const predictionPromises = stopIds.map(async (stopId) => {
                const response = await axios.get(
                    `https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_TRAIN_API_KEY}&stpid=${stopId}&outputType=JSON`
                );
                
                const predictions = response.data.ctatt?.eta || [];
                console.log(`[Home] Fetched ${predictions.length} train predictions for stop ${stopId}`);
                
                const groupedPredictions = predictions.length > 0 ? 
                    predictions.reduce((acc, prediction) => {
                        const direction = prediction.stpDe; 
                        if (!acc[direction]) {
                            acc[direction] = [];
                        }
                        acc[direction].push({
                            arrivalTime: prediction.arrT,
                            destination: prediction.destNm,
                            runNumber: prediction.rn,
                            isDelayed: prediction.isDly === "1",
                            isApproaching: prediction.isApp === "1",
                            isScheduled: prediction.isSch === "1",
                            route: prediction.rt,
                            stopName: prediction.staNm,
                            stopDescription: prediction.stpDe
                        });
                        return acc;
                    }, {}) 
                    : {}; 

                return {
                    stopId,
                    predictions: groupedPredictions
                };
            });

            const results = await Promise.all(predictionPromises);
            return results;
        } catch (error) {
            console.error('[Home] Error fetching train predictions:', error);
            return [];
        }
    };

    const fetchBusPredictions = async (routeNumber, stopIds) => {
        try {
            const predictionPromises = Object.entries(stopIds).map(async ([direction, stopId]) => {
                const response = await axios.get(
                    `http://www.ctabustracker.com/bustime/api/v2/getpredictions?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${routeNumber}&stpid=${stopId}&format=json`
                );
                
                const predictions = response.data['bustime-response'].prd || [];
                console.log(`[Home] Fetched ${predictions.length} bus predictions for route ${routeNumber} at stop ${stopId}`);
                
                return {
                    direction,
                    predictions: predictions.filter(pred => pred.rtdir === direction)
                };
            });

            const results = await Promise.all(predictionPromises);
            
            const directionPredictions = {};
            results.forEach(result => {
                directionPredictions[result.direction] = result.predictions;
            });
            
            return directionPredictions;
        } catch (error) {
            console.error('[Home] Error fetching bus predictions:', error);
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

    const renderTrainPredictions = (trainPredictions) => {
        if (!trainPredictions || !Array.isArray(trainPredictions) || trainPredictions.length === 0) {
            return (
                <View style={styles.predictionsContainer}>
                    <Text style={styles.noPredictions}>No predictions available</Text>
                </View>
            );
        }

        return (
            <View style={styles.predictionsContainer}>
                {trainPredictions.map((stopPredictions, stopIndex) => {
                    if (!stopPredictions || !stopPredictions.predictions) {
                        return null;
                    }

                    return (
                        <View key={stopIndex} style={[
                            styles.stopPredictionsContainer,
                            stopIndex === trainPredictions.length - 1 && { marginBottom: 0, borderBottomWidth: 0 } //removes margin if it is last row
                        ]}>
                            {Object.entries(stopPredictions.predictions).map(([direction, predictions], dirIndex, dirArray) => {
                                if (!Array.isArray(predictions)) {
                                    return null;
                                }

                                return (
                                    <View key={`${direction}-${dirIndex}`} style={[
                                        styles.directionContainer,
                                        dirIndex === dirArray.length - 1 && { marginBottom: 0 }
                                    ]}>
                                        <Text style={styles.directionHeader}>{direction}</Text>
                                        <View style={styles.tableHeader}>
                                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Run</Text>
                                            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>To</Text>
                                            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>ETA</Text>
                                        </View>
                                        {predictions.map((prediction, index) => {
                                            const arrivalTime = new Date(prediction.arrivalTime);
                                            const currentTime = new Date();
                                            const timeDiff = Math.round((arrivalTime - currentTime) / 60000);
                                            const isDue = prediction.isApproaching || timeDiff <= 2;

                                            return (
                                                <View key={index} style={[
                                                    styles.tableRow,
                                                    index === predictions.length - 1 && { borderBottomWidth: 0 }
                                                ]}>
                                                    <Text style={[styles.tableCell, { flex: 1 }]}>
                                                        {prediction.runNumber}
                                                    </Text>
                                                    <Text style={[styles.tableCell, { flex: 2 }]}>
                                                        {prediction.destination}
                                                    </Text>
                                                    <View style={[styles.etaContainer]}>
                                                        <Text style={[
                                                            styles.etaText,
                                                            prediction.isDelayed && styles.delayedText,
                                                            isDue && styles.dueText,
                                                            prediction.isScheduled && styles.scheduledText
                                                        ]}>
                                                            {isDue ? "DUE" : `${timeDiff} min`}
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderBusPredictions = (busPredictions) => (
        <View style={styles.predictionsContainer}>
            {Object.entries(busPredictions).map(([direction, predictions], index, array) => (
                <View key={direction} style={[
                    styles.directionContainer,
                    index === array.length - 1 && { marginBottom: 0 }
                ]}>
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
                                const etaText = prediction.prdctdn === "DUE" || parseInt(prediction.prdctdn) <= 2 
                                    ? "DUE" 
                                    : `${prediction.prdctdn} min`;
                                
                                return (
                                    <View key={index} style={[
                                        styles.tableRow,
                                        index === predictions.length - 1 && { borderBottomWidth: 0 }
                                    ]}>
                                        <Text style={[styles.tableCell, { flex: 1 }]}>
                                            {prediction.vid}
                                        </Text>
                                        <Text style={[styles.tableCell, { flex: 2 }]}>
                                            {prediction.des}
                                        </Text>
                                        <View style={[styles.etaContainer]}>
                                            <Text style={[
                                                styles.etaText,
                                                isDelayed && styles.delayedText,
                                                etaText === "DUE" && styles.dueText
                                            ]}>
                                                {etaText}
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
        <TouchableOpacity 
            onPress={() => toggleExpanded(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.favoriteCard}>
                <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                <View style={styles.favoriteInfo}>
                    <View style={styles.favoriteHeader}>
                        <View style={styles.favoriteMainContent}>
                            <Text style={styles.favoriteName}>{item.name}</Text>
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
                        </View>
                        <View style={styles.iconContainer}>
                            <TouchableOpacity 
                                onPress={() => removeFavorite(item)}
                                style={styles.removeButton}
                            >
                                <Ionicons 
                                    name="heart" 
                                    size={24} 
                                    color="#FF3B30" 
                                />
                            </TouchableOpacity>
                            <Ionicons 
                                name={expandedItems[item.id] ? "chevron-up" : "chevron-down"} 
                                size={16} 
                                color="#666" 
                                style={styles.expandIcon}
                            />
                        </View>
                    </View>
                    {expandedItems[item.id] && renderPredictions(item)}
                </View>
            </View>
        </TouchableOpacity>
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
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? (
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
        paddingHorizontal: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    title: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: '#333333',
    },
    refreshButton: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: '#F0F8FF',
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        flex: 1,
        width: '100%',
    },
    listContent: {
        paddingVertical: 12,
        paddingBottom: 24,
    },
    favoriteCard: {
        flexDirection: 'row',
        alignItems: 'stretch',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    colorIndicator: {
        width: 6,
        height: '100%',
    },
    favoriteInfo: {
        flex: 1,
        padding: 12,
    },
    favoriteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    favoriteMainContent: {
        flex: 1,
        paddingRight: 8,
    },
    favoriteName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        flexWrap: 'wrap',
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    typeIcon: {
        marginRight: 4,
    },
    favoriteType: {
        fontSize: 14,
        color: '#666666',
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    removeButton: {
        padding: 6,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    predictionsContainer: {
        marginTop: 6,
        backgroundColor: '#F9F9F9',
        borderRadius: 8,
        padding: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: 6,
        marginBottom: 2,
    },
    tableHeaderCell: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666666',
        textTransform: 'uppercase',
        textAlign: 'left'
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#EEEEEE',
    },
    tableCell: {
        fontSize: 15,
        color: '#333333',
        textAlign: 'left'
    },
    etaContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        flex: 1
    },
    etaText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#666666',
        textAlign: 'right'
    },
    delayedText: {
        color: '#FF3B30',
    },
    dueText: {
        color: '#34C759',
    },
    scheduledText: {
        fontWeight: 'normal',
    },
    noPredictions: {
        fontSize: 15,
        color: '#999999',
        textAlign: 'center',
        paddingVertical: 6,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 48,
    },
    noFavorites: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666666',
        marginTop: 12,
        marginBottom: 6,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: '#999999',
        textAlign: 'center',
        paddingHorizontal: 24,
    },
    directionContainer: {
        marginBottom: 8
    },
    directionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 6
    },
    stopPredictionsContainer: {
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    expandIcon: {
        marginLeft: 4,
    },
    removedCard: {
        opacity: 0.7,
        backgroundColor: '#F8F8F8',
    },
});

export default Home;
