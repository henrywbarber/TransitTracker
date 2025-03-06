import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

function Home() {
    const [favorites, setFavorites] = useState([]);
    const [predictions, setPredictions] = useState({});
    const [isLoading, setIsLoading] = useState(false);

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
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    };

    const removeFavorite = (item) => {
        //console.log(item)
        let tempFavs = favorites.filter(
            fav => !(fav.id === item.id)
        );
        setFavorites(tempFavs)
        AsyncStorage.setItem(JSON.stringify(tempFavs))
    }

    const fetchAllPredictions = async () => {
        setIsLoading(true);
        try {
            const predictionPromises = favorites.map(favorite => {
                if (favorite.type === 'train') {
                    return fetchTrainPredictions(favorite.stopId);
                } else {
                    return fetchBusPredictions(favorite.routeNumber, favorite.stopId);
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

    const fetchTrainPredictions = async (stopId) => {
        try {
            const response = await axios.get(
                `https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?key=${process.env.EXPO_PUBLIC_CTA_TRAIN_API_KEY}&stpid=${stopId}&outputType=JSON`
            );
            return response.data.ctatt ? response.data.ctatt.eta : [];
        } catch (error) {
            console.error('Error fetching train predictions:', error);
            return [];
        }
    };

    const fetchBusPredictions = async (routeNumber, stopId) => {
        try {
            const response = await axios.get(
                `http://www.ctabustracker.com/bustime/api/v2/getpredictions?key=${process.env.EXPO_PUBLIC_CTA_BUS_API_KEY}&rt=${routeNumber}&stpid=${stopId}&format=json`
            );
            
            const predictions = response.data['bustime-response'].prd || [];
            console.log(predictions)
            return predictions;
        } catch (error) {
            console.error('Error fetching bus predictions:', error);
            return [];
        }
    };

    const renderPredictions = (item) => {
        const itemPredictions = predictions[item.id] || [];
        
        if (item.type === 'train') {
            return renderTrainPredictions(itemPredictions);
        } else {
            return renderBusPredictions(itemPredictions);
        }
    };

    const renderTrainPredictions = (trainPredictions) => (
        <View style={styles.predictionsContainer}>
            {trainPredictions.map((prediction, index) => {
                const arrivalTime = new Date(prediction.arrT);
                const currentTime = new Date();
                const timeDiff = Math.round((arrivalTime - currentTime) / 60000);
                
                return (
                    <View key={index} style={styles.predictionRow}>
                        <Text style={styles.predictionText}>{prediction.destNm}</Text>
                        <Text style={[
                            styles.predictionTime,
                            prediction.isDly === "1" && styles.delayedText,
                            (prediction.isApp === "1" || timeDiff <= 2) && styles.dueText
                        ]}>
                            {prediction.isApp === "1" || timeDiff <= 2 ? "DUE" : `${timeDiff} min`}
                        </Text>
                    </View>
                );
            })}
        </View>
    );

    const renderBusPredictions = (busPredictions) => (
        <View style={styles.predictionsContainer}>
            {busPredictions.length > 0 ? (
                busPredictions.map((prediction, index) => (
                    <View key={index} style={styles.predictionRow}>
                        <Text style={styles.predictionText}>
                            To {prediction.des}
                        </Text>
                        <Text style={[
                            styles.predictionTime,
                            parseInt(prediction.prdctdn) <= 2 && styles.dueText
                        ]}>
                            {prediction.prdctdn <= 0 ? "DUE" : `${prediction.prdctdn} min`}
                        </Text>
                    </View>
                ))
            ) : (
                <Text style={styles.noPredictions}>No predictions available</Text>
            )}
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
                        <Ionicons name="heart" size={24} color="red" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.favoriteType}>
                    {item.type === 'train' ? 'Train Station' : 'Bus Stop'}
                </Text>
                {renderPredictions(item)}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Favorites</Text>
                <TouchableOpacity onPress={fetchAllPredictions} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>
            
            {isLoading && <ActivityIndicator style={styles.loader} />}
            
            {favorites.length > 0 ? (
                <FlatList
                    data={favorites}
                    renderItem={renderFavorite}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    style={styles.list}
                />
            ) : (
                <Text style={styles.noFavorites}>No favorites added yet</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    refreshButton: {
        padding: 8,
    },
    loader: {
        marginVertical: 8,
    },
    predictionsContainer: {
        marginTop: 8,
    },
    predictionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    predictionText: {
        flex: 1,
        fontSize: 14,
    },
    predictionTime: {
        fontSize: 14,
        fontWeight: 'bold',
        minWidth: 60,
        textAlign: 'right',
    },
    delayedText: {
        color: 'red',
    },
    dueText: {
        color: 'green',
    },
    favoriteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    favoriteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginBottom: 8,
    },
    colorIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 16,
    },
    favoriteInfo: {
        flex: 1,
    },
    favoriteName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    favoriteType: {
        fontSize: 14,
        color: '#666',
    },
    removeButton: {
        padding: 8,
    },
    list: {
        flex: 1,
        width: '100%',
    },
    noFavorites: {
        fontSize: 18,
        color: '#666',
        marginTop: 16,
    },
    noPredictions: {
        fontSize: 18,
        color: '#666',
        marginTop: 16,
        textAlign: 'center',
    },
});

export default Home;
