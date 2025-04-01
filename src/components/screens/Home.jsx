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
    //const [trainPredictions, setTrainPredictions] = useState({})

    //loads the favorites everytime the home window is focused
    useFocusEffect(
        React.useCallback(() => {
            loadFavorites();
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
            
            const interval = setInterval(fetchAllPredictions, 60000);           
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

    const removeFavorite = async (item) => {
        //console.log(favorites)
        let tempFavs = favorites.filter(
            fav => !(fav.id === item.id)
        );
        setFavorites(tempFavs)
        await AsyncStorage.setItem('favorites', JSON.stringify(tempFavs))
        //console.log(tempFavs)
    }

    const fetchAllPredictions = async () => {
        setIsLoading(true);
        try {
            const predictionPromises = favorites.map(favorite => {
                if (favorite.type === 'train') { //fetching bus and train favorites individually
                    return fetchTrainPredictions(favorite.stopId);
                } else {
                    return fetchBusPredictions(favorite.routeNumber, favorite.stopIds);
                }
            });

            const results = await Promise.all(predictionPromises); //wait to continue until all returned
            
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
            //stop IDs of a particular station are passed in as an array for the station
            const predictionPromises = stopIds.map(async (stopId) => {
                const response = await axios.get(
                    `https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_TRAIN_API_KEY}&stpid=${stopId}&outputType=JSON`
                );
                
                const predictions = response.data.ctatt?.eta || []; //checks if ctatt exists before using eta
                
                const groupedPredictions = predictions.length > 0 ? 
                    predictions.reduce((acc, prediction) => {
                        const direction = prediction.stpDe; 
                        if (!acc[direction]) {
                            acc[direction] = [];
                        }
                        //will be formatted like json data where direction is the entry and below data is entered there
                        acc[direction].push({  //taking all the important data from the API fetch
                            arrivalTime: prediction.arrT,
                            destination: prediction.destNm,
                            runNumber: prediction.rn,
                            isDelayed: prediction.isDly === "1",
                            isApproaching: prediction.isApp === "1",
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
            console.error('Error fetching train predictions:', error);
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
                
                return {
                    direction,
                    predictions: predictions.filter(pred => pred.rtdir === direction)//only take the predictions for the correct direction
                };
            });

            const results = await Promise.all(predictionPromises);
            
            
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
        console.log("Item predictions for", item.id, ":", itemPredictions);
        
        if (item.type === 'train') {
            return renderTrainPredictions(itemPredictions);
        } else {
            return renderBusPredictions(itemPredictions);
        }
    };

    const renderTrainPredictions = (trainPredictions) => {
        console.log("Train Predictions received:", trainPredictions);

        if (!trainPredictions || !Array.isArray(trainPredictions) || trainPredictions.length === 0) { //error checking
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
                                                            isDue && styles.dueText
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
                                const isDue = parseInt(prediction.prdctdn) <= 2;
                                
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
        textAlign: 'left'
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
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
        marginBottom: 12
    },
    directionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 8
    },
    stopPredictionsContainer: {
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    
});

export default Home;
